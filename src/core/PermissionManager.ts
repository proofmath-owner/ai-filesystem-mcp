import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PermissionInfo {
  owner: string;
  group: string;
  mode: string;
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

export class PermissionManager {
  // 파일 권한 변경
  async changePermissions(filePath: string, permissions: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    
    // 권한 문자열 검증 (예: '755', '644', 'rwxr-xr-x')
    const octalPattern = /^[0-7]{3,4}$/;
    const symbolicPattern = /^[rwx-]{9}$/;
    
    if (!octalPattern.test(permissions) && !symbolicPattern.test(permissions)) {
      throw new Error('Invalid permission format. Use octal (755) or symbolic (rwxr-xr-x)');
    }
    
    try {
      if (octalPattern.test(permissions)) {
        const mode = parseInt(permissions, 8);
        await fs.chmod(absolutePath, mode);
      } else {
        // 심볼릭 권한을 8진수로 변환
        const mode = this.symbolicToOctal(permissions);
        await fs.chmod(absolutePath, mode);
      }
    } catch (error) {
      throw new Error(`Failed to change permissions: ${error}`);
    }
  }

  // 파일 소유자 변경 (Unix/Linux만 지원)
  async changeOwner(filePath: string, user: string, group?: string): Promise<void> {
    if (process.platform === 'win32') {
      throw new Error('Changing ownership is not supported on Windows');
    }
    
    const absolutePath = path.resolve(filePath);
    
    try {
      // chown 명령 사용
      const groupPart = group ? `:${group}` : '';
      const { stderr } = await execAsync(`chown ${user}${groupPart} "${absolutePath}"`);
      
      if (stderr) {
        throw new Error(stderr);
      }
    } catch (error) {
      throw new Error(`Failed to change owner: ${error}`);
    }
  }

  // 파일 권한 정보 가져오기
  async getPermissions(filePath: string): Promise<PermissionInfo> {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.stat(absolutePath);
    
    // Unix 스타일 권한
    const mode = (stats.mode & parseInt('777', 8)).toString(8);
    const modeString = this.octalToSymbolic(parseInt(mode, 8));
    
    // 읽기/쓰기/실행 권한 체크
    const readable = await this.checkAccess(absolutePath, fs.constants.R_OK);
    const writable = await this.checkAccess(absolutePath, fs.constants.W_OK);
    const executable = await this.checkAccess(absolutePath, fs.constants.X_OK);
    
    // 소유자 정보 (Unix/Linux만)
    let owner = 'unknown';
    let group = 'unknown';
    
    if (process.platform !== 'win32') {
      try {
        const { stdout } = await execAsync(`ls -l "${absolutePath}" | awk '{print $3, $4}'`);
        const [ownerResult, groupResult] = stdout.trim().split(' ');
        owner = ownerResult || 'unknown';
        group = groupResult || 'unknown';
      } catch (error) {
        // 오류 무시
      }
    }
    
    return {
      owner,
      group,
      mode,
      readable,
      writable,
      executable
    };
  }

  // 파일 접근 권한 체크
  private async checkAccess(filePath: string, mode: number): Promise<boolean> {
    try {
      await fs.access(filePath, mode);
      return true;
    } catch {
      return false;
    }
  }

  // 8진수를 심볼릭 권한으로 변환
  private octalToSymbolic(octal: number): string {
    const permissions = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
    const user = permissions[(octal >> 6) & 7];
    const group = permissions[(octal >> 3) & 7];
    const other = permissions[octal & 7];
    return user + group + other;
  }

  // 심볼릭 권한을 8진수로 변환
  private symbolicToOctal(symbolic: string): number {
    if (symbolic.length !== 9) {
      throw new Error('Invalid symbolic permission format');
    }
    
    let mode = 0;
    const parts = [symbolic.substr(0, 3), symbolic.substr(3, 3), symbolic.substr(6, 3)];
    
    parts.forEach((part, index) => {
      let value = 0;
      if (part[0] === 'r') value += 4;
      if (part[1] === 'w') value += 2;
      if (part[2] === 'x') value += 1;
      mode += value << ((2 - index) * 3);
    });
    
    return mode;
  }

  // 위험한 경로 체크
  isDangerousPath(filePath: string): boolean {
    const dangerous = [
      '/etc',
      '/sys',
      '/proc',
      '/dev',
      '/boot',
      '/var/log',
      'C:\\Windows',
      'C:\\Program Files',
      '/System',
      '/Library',
      '/usr/bin',
      '/usr/sbin',
      '/bin',
      '/sbin'
    ];
    
    const absolutePath = path.resolve(filePath);
    return dangerous.some(d => absolutePath.startsWith(d));
  }

  // 안전한 작업 영역 검증
  async validateSafeWorkspace(directory: string): Promise<{
    safe: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const absolutePath = path.resolve(directory);
    
    // 위험한 경로 체크
    if (this.isDangerousPath(absolutePath)) {
      warnings.push('Directory is in a system-critical location');
    }
    
    // 권한 체크
    try {
      const perms = await this.getPermissions(absolutePath);
      
      if (!perms.readable) {
        warnings.push('Directory is not readable');
      }
      
      if (!perms.writable) {
        warnings.push('Directory is not writable');
      }
      
      // 루트 디렉토리 체크
      if (absolutePath === '/' || absolutePath === 'C:\\') {
        warnings.push('Working in root directory is dangerous');
      }
      
      // 홈 디렉토리 직접 사용 경고
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (homeDir && absolutePath === homeDir) {
        warnings.push('Working directly in home directory - consider using a subdirectory');
      }
    } catch (error) {
      warnings.push(`Permission check failed: ${error}`);
    }
    
    return {
      safe: warnings.length === 0,
      warnings
    };
  }

  // 샌드박스 환경 생성
  async createSandbox(basePath: string): Promise<string> {
    const sandboxPath = path.join(basePath, `.sandbox-${Date.now()}`);
    await fs.mkdir(sandboxPath, { recursive: true });
    
    // 샌드박스 권한 설정 (소유자만 읽기/쓰기/실행)
    await this.changePermissions(sandboxPath, '700');
    
    return sandboxPath;
  }

  // 권한 에스컬레이션 체크
  async requiresElevation(filePath: string, operation: 'read' | 'write' | 'execute'): Promise<boolean> {
    const absolutePath = path.resolve(filePath);
    
    try {
      const modeMap = {
        read: fs.constants.R_OK,
        write: fs.constants.W_OK,
        execute: fs.constants.X_OK
      };
      
      await fs.access(absolutePath, modeMap[operation]);
      return false;
    } catch {
      // 접근 불가 - 권한 상승 필요
      return true;
    }
  }
}