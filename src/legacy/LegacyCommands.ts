import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { FileSystemManager } from '../core/FileSystemManager.js';

interface LegacyCommandHandler {
  (args: any): Promise<any>;
}

interface LegacyRegistry {
  tools: Tool[];
  handlers: Map<string, LegacyCommandHandler>;
}

/**
 * 아직 Command 패턴으로 마이그레이션되지 않은 legacy 명령어들을 처리합니다.
 * 점진적으로 이 파일의 내용을 줄여나가면서 새 Command 시스템으로 이전할 예정입니다.
 */
export function createLegacyCommandsRegistry(fsManager: FileSystemManager): LegacyRegistry {
  const tools: Tool[] = [];
  const handlers = new Map<string, LegacyCommandHandler>();

  // === 아직 마이그레이션되지 않은 도구들 ===
  
  // 나머지 도구들도 점진적으로 추가...
  // TODO: 다음 도구들을 Command 패턴으로 마이그레이션
  // === Metadata Commands (7개) ===
  // - analyze_project
  // - get_file_metadata
  // - get_directory_tree
  // - compare_files
  // - find_duplicate_files
  // - create_symlink
  // - diff_files
  //
  // === Security Commands ===
  // ✅ change_permissions (완료)
  // ✅ encrypt_file (완료)
  // ✅ decrypt_file (완료)
  // ✅ scan_secrets (완료)
  // ✅ security_audit (완료)
  //
  // === Cloud Commands ===
  // ✅ sync_with_cloud (완료)

  return { tools, handlers };
}
