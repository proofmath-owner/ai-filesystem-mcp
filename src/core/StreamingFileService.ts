import { createReadStream, createWriteStream, promises as fs, WriteStream } from 'fs';
import { Transform, Readable, Writable, pipeline } from 'stream';
import { promisify } from 'util';
import * as path from 'path';
import * as crypto from 'crypto';
import { Worker } from 'worker_threads';

const pipelineAsync = promisify(pipeline);

export interface StreamingOptions {
  chunkSize?: number;          // 청크 크기 (기본: 64KB)
  encoding?: BufferEncoding;   // 인코딩
  highWaterMark?: number;      // 스트림 버퍼 크기
  useWorker?: boolean;         // 워커 스레드 사용
  compressionLevel?: number;   // 압축 레벨 (0-9)
  enableChecksum?: boolean;    // 체크섬 생성
}

export interface StreamingResult {
  success: boolean;
  bytesProcessed: number;
  chunks: number;
  duration: number;
  checksum?: string;
  error?: string;
}

export interface ProgressInfo {
  bytesProcessed: number;
  totalBytes: number;
  percentage: number;
  chunksProcessed: number;
  currentChunkSize: number;
  speed: number; // bytes per second
}

export class StreamingFileService {
  private static readonly DEFAULT_CHUNK_SIZE = 64 * 1024; // 64KB
  private static readonly DEFAULT_HIGH_WATER_MARK = 16 * 1024; // 16KB
  private workers: Map<string, Worker> = new Map();

  constructor() {}

  // 대용량 파일 스트리밍 읽기
  async readFileStreaming(
    filePath: string,
    options: StreamingOptions = {},
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<StreamingResult> {
    const startTime = Date.now();
    const absolutePath = path.resolve(filePath);

    try {
      const stats = await fs.stat(absolutePath);
      const totalBytes = stats.size;
      
      if (totalBytes === 0) {
        return {
          success: true,
          bytesProcessed: 0,
          chunks: 0,
          duration: Date.now() - startTime
        };
      }

      const chunkSize = options.chunkSize || StreamingFileService.DEFAULT_CHUNK_SIZE;
      const chunks: Buffer[] = [];
      let bytesProcessed = 0;
      let chunksProcessed = 0;
      let checksum: crypto.Hash | null = null;

      if (options.enableChecksum) {
        checksum = crypto.createHash('sha256');
      }

      // 읽기 스트림 생성
      const readStream = createReadStream(absolutePath, {
        encoding: null, // Buffer로 읽기
        highWaterMark: options.highWaterMark || StreamingFileService.DEFAULT_HIGH_WATER_MARK
      });

      // 변환 스트림으로 청크 처리
      const transformStream = new Transform({
        objectMode: false,
        transform(chunk: Buffer, encoding, callback) {
          const now = Date.now();
          bytesProcessed += chunk.length;
          chunksProcessed++;

          // 체크섬 업데이트
          if (checksum) {
            checksum.update(chunk);
          }

          // 진행률 콜백
          if (onProgress) {
            const progress: ProgressInfo = {
              bytesProcessed,
              totalBytes,
              percentage: (bytesProcessed / totalBytes) * 100,
              chunksProcessed,
              currentChunkSize: chunk.length,
              speed: bytesProcessed / ((now - startTime) / 1000)
            };
            onProgress(progress);
          }

          chunks.push(chunk);
          callback(null, chunk);
        }
      });

      // 파이프라인 실행
      await pipelineAsync(readStream, transformStream);

      const result: StreamingResult = {
        success: true,
        bytesProcessed,
        chunks: chunksProcessed,
        duration: Date.now() - startTime
      };

      if (checksum) {
        result.checksum = checksum.digest('hex');
      }

      return result;

    } catch (error) {
      return {
        success: false,
        bytesProcessed: 0,
        chunks: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 대용량 파일 스트리밍 쓰기
  async writeFileStreaming(
    filePath: string,
    dataStream: Readable,
    options: StreamingOptions = {},
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<StreamingResult> {
    const startTime = Date.now();
    const absolutePath = path.resolve(filePath);

    try {
      // 디렉토리 생성
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      let bytesProcessed = 0;
      let chunksProcessed = 0;
      let checksum: crypto.Hash | null = null;

      if (options.enableChecksum) {
        checksum = crypto.createHash('sha256');
      }

      // 쓰기 스트림 생성
      const writeStream = createWriteStream(absolutePath, {
        highWaterMark: options.highWaterMark || StreamingFileService.DEFAULT_HIGH_WATER_MARK
      });

      // 변환 스트림으로 진행률 추적
      const progressStream = new Transform({
        objectMode: false,
        transform(chunk: Buffer, encoding, callback) {
          const now = Date.now();
          bytesProcessed += chunk.length;
          chunksProcessed++;

          // 체크섬 업데이트
          if (checksum) {
            checksum.update(chunk);
          }

          // 진행률 콜백
          if (onProgress) {
            const progress: ProgressInfo = {
              bytesProcessed,
              totalBytes: 0, // 스트림이므로 전체 크기 미지
              percentage: 0,
              chunksProcessed,
              currentChunkSize: chunk.length,
              speed: bytesProcessed / ((now - startTime) / 1000)
            };
            onProgress(progress);
          }

          callback(null, chunk);
        }
      });

      // 파이프라인 실행
      await pipelineAsync(dataStream, progressStream, writeStream);

      const result: StreamingResult = {
        success: true,
        bytesProcessed,
        chunks: chunksProcessed,
        duration: Date.now() - startTime
      };

      if (checksum) {
        result.checksum = checksum.digest('hex');
      }

      return result;

    } catch (error) {
      return {
        success: false,
        bytesProcessed: 0,
        chunks: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 파일 변환 스트리밍 (읽기 + 처리 + 쓰기)
  async transformFileStreaming(
    inputPath: string,
    outputPath: string,
    transformFn: (chunk: Buffer) => Buffer | Promise<Buffer>,
    options: StreamingOptions = {},
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<StreamingResult> {
    const startTime = Date.now();
    const absoluteInputPath = path.resolve(inputPath);
    const absoluteOutputPath = path.resolve(outputPath);

    try {
      const stats = await fs.stat(absoluteInputPath);
      const totalBytes = stats.size;

      // 디렉토리 생성
      await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });

      let bytesProcessed = 0;
      let chunksProcessed = 0;
      let checksum: crypto.Hash | null = null;

      if (options.enableChecksum) {
        checksum = crypto.createHash('sha256');
      }

      // 스트림 생성
      const readStream = createReadStream(absoluteInputPath, {
        encoding: null,
        highWaterMark: options.highWaterMark || StreamingFileService.DEFAULT_HIGH_WATER_MARK
      });

      const writeStream = createWriteStream(absoluteOutputPath, {
        highWaterMark: options.highWaterMark || StreamingFileService.DEFAULT_HIGH_WATER_MARK
      });

      // 변환 스트림
      const transformStream = new Transform({
        objectMode: false,
        async transform(chunk: Buffer, encoding, callback) {
          try {
            const now = Date.now();
            
            // 변환 함수 적용
            const transformedChunk = await transformFn(chunk);
            
            bytesProcessed += chunk.length;
            chunksProcessed++;

            // 체크섬 업데이트 (원본 데이터로)
            if (checksum) {
              checksum.update(chunk);
            }

            // 진행률 콜백
            if (onProgress) {
              const progress: ProgressInfo = {
                bytesProcessed,
                totalBytes,
                percentage: (bytesProcessed / totalBytes) * 100,
                chunksProcessed,
                currentChunkSize: chunk.length,
                speed: bytesProcessed / ((now - startTime) / 1000)
              };
              onProgress(progress);
            }

            callback(null, transformedChunk);
          } catch (error) {
            callback(error);
          }
        }
      });

      // 파이프라인 실행
      await pipelineAsync(readStream, transformStream, writeStream);

      const result: StreamingResult = {
        success: true,
        bytesProcessed,
        chunks: chunksProcessed,
        duration: Date.now() - startTime
      };

      if (checksum) {
        result.checksum = checksum.digest('hex');
      }

      return result;

    } catch (error) {
      return {
        success: false,
        bytesProcessed: 0,
        chunks: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 대용량 파일 분할
  async splitFileStreaming(
    inputPath: string,
    outputDir: string,
    splitSize: number, // bytes
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<StreamingResult & { parts: string[] }> {
    const startTime = Date.now();
    const absoluteInputPath = path.resolve(inputPath);
    const absoluteOutputDir = path.resolve(outputDir);

    try {
      const stats = await fs.stat(absoluteInputPath);
      const totalBytes = stats.size;
      const fileName = path.basename(inputPath, path.extname(inputPath));
      const extension = path.extname(inputPath);

      // 출력 디렉토리 생성
      await fs.mkdir(absoluteOutputDir, { recursive: true });

      const parts: string[] = [];
      let bytesProcessed = 0;
      let chunksProcessed = 0;
      let currentPartIndex = 0;
      let currentPartBytes = 0;
      let currentWriteStream: WriteStream | null = null;

      // 읽기 스트림 생성
      const readStream = createReadStream(absoluteInputPath, {
        encoding: null,
        highWaterMark: StreamingFileService.DEFAULT_HIGH_WATER_MARK
      });

      // 분할 스트림
      const splitStream = new Transform({
        objectMode: false,
        transform(chunk: Buffer, encoding, callback) {
          processSplitChunk(chunk, callback);
        },
        flush(callback) {
          if (currentWriteStream) {
            currentWriteStream.end();
          }
          callback();
        }
      });

      const processSplitChunk = (chunk: Buffer, callback: Function) => {
        const processChunk = async () => {
          try {
            let chunkOffset = 0;

            while (chunkOffset < chunk.length) {
              // 새 파트 파일 시작
              if (!currentWriteStream || currentPartBytes >= splitSize) {
                if (currentWriteStream) {
                  currentWriteStream.end();
                }

                const partPath = path.join(
                  absoluteOutputDir,
                  `${fileName}.part${currentPartIndex.toString().padStart(3, '0')}${extension}`
                );
                parts.push(partPath);
                currentWriteStream = createWriteStream(partPath);
                currentPartIndex++;
                currentPartBytes = 0;
              }

              // 쓸 바이트 수 계산
              const remainingInPart = splitSize - currentPartBytes;
              const remainingInChunk = chunk.length - chunkOffset;
              const bytesToWrite = Math.min(remainingInPart, remainingInChunk);

              // 데이터 쓰기
              const chunkToWrite = chunk.slice(chunkOffset, chunkOffset + bytesToWrite);
              currentWriteStream!.write(chunkToWrite);

              chunkOffset += bytesToWrite;
              currentPartBytes += bytesToWrite;
              bytesProcessed += bytesToWrite;
            }

            chunksProcessed++;

            // 진행률 콜백
            if (onProgress) {
              const now = Date.now();
              const progress: ProgressInfo = {
                bytesProcessed,
                totalBytes,
                percentage: (bytesProcessed / totalBytes) * 100,
                chunksProcessed,
                currentChunkSize: chunk.length,
                speed: bytesProcessed / ((now - startTime) / 1000)
              };
              onProgress(progress);
            }

            callback();
          } catch (error) {
            callback(error);
          }
        };

        processChunk();
      };

      // 파이프라인 실행
      await pipelineAsync(readStream, splitStream);

      return {
        success: true,
        bytesProcessed,
        chunks: chunksProcessed,
        duration: Date.now() - startTime,
        parts
      };

    } catch (error) {
      return {
        success: false,
        bytesProcessed: 0,
        chunks: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        parts: []
      };
    }
  }

  // 분할된 파일 병합
  async mergeFilesStreaming(
    partPaths: string[],
    outputPath: string,
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<StreamingResult> {
    const startTime = Date.now();
    const absoluteOutputPath = path.resolve(outputPath);

    try {
      // 전체 크기 계산
      let totalBytes = 0;
      for (const partPath of partPaths) {
        const stats = await fs.stat(partPath);
        totalBytes += stats.size;
      }

      // 출력 디렉토리 생성
      await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });

      let bytesProcessed = 0;
      let chunksProcessed = 0;

      // 쓰기 스트림 생성
      const writeStream = createWriteStream(absoluteOutputPath);

      // 각 파트 파일 순차 처리
      for (let i = 0; i < partPaths.length; i++) {
        const partPath = partPaths[i];
        const readStream = createReadStream(partPath, {
          encoding: null
        });

        // 진행률 추적 스트림
        const progressStream = new Transform({
          objectMode: false,
          transform(chunk: Buffer, encoding, callback) {
            const now = Date.now();
            bytesProcessed += chunk.length;
            chunksProcessed++;

            if (onProgress) {
              const progress: ProgressInfo = {
                bytesProcessed,
                totalBytes,
                percentage: (bytesProcessed / totalBytes) * 100,
                chunksProcessed,
                currentChunkSize: chunk.length,
                speed: bytesProcessed / ((now - startTime) / 1000)
              };
              onProgress(progress);
            }

            callback(null, chunk);
          }
        });

        // 마지막 파일이 아니면 end 이벤트를 무시
        if (i < partPaths.length - 1) {
          progressStream.pipe(writeStream, { end: false });
          await pipelineAsync(readStream, progressStream);
        } else {
          // 마지막 파일은 정상적으로 종료
          await pipelineAsync(readStream, progressStream, writeStream);
        }
      }

      return {
        success: true,
        bytesProcessed,
        chunks: chunksProcessed,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        bytesProcessed: 0,
        chunks: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processChunkInWorker(chunk: Buffer, chunkIndex: number): Promise<void> {
    // 워커 스레드에서 CPU 집약적 작업 수행
    // 예: 압축, 암호화, 해싱 등
  }

  // 리소스 정리
  async dispose(): Promise<void> {
    // 모든 워커 종료
    const workers = Array.from(this.workers.values());
    await Promise.all(workers.map(worker => worker.terminate()));
    this.workers.clear();
  }
}

export default StreamingFileService;