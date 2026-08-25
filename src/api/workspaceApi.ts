import type { ChatMessage, HomeEntry, WsNode, WsSession, Workspace } from '../domain/workspace';
import { asNodeId, asSessionId, asWorkspaceId } from '../domain/workspace';
import { apiClient } from './client';

interface WorkspaceDto {
  id: string;
  name: string;
  description: string | null;
  root_path?: string | null;
  is_archived?: boolean;
}

interface SessionDto {
  id: string;
  workspace_id: string;
  title: string;
  tab_open?: boolean;
  agent_busy?: boolean;
}

interface NodeDto {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  kind: 'folder' | 'file';
  name: string;
  rel_path: string;
  size_bytes: number;
  file_count: number;
}

interface EventDto {
  id: string;
  session_id: string;
  kind: string;
  role: string | null;
  content: string | null;
  created_at: string;
}

function toWorkspace(dto: WorkspaceDto): Workspace {
  return {
    id: asWorkspaceId(dto.id),
    name: dto.name,
    description: dto.description,
    rootPath: dto.root_path ?? null,
    isArchived: Boolean(dto.is_archived),
  };
}

function toSession(dto: SessionDto): WsSession {
  return {
    id: asSessionId(dto.id),
    workspaceId: asWorkspaceId(dto.workspace_id),
    title: dto.title,
    tabOpen: Boolean(dto.tab_open),
    agentBusy: Boolean(dto.agent_busy),
  };
}

function toNode(dto: NodeDto): WsNode {
  return {
    id: asNodeId(dto.id),
    workspaceId: asWorkspaceId(dto.workspace_id),
    parentId: dto.parent_id ? asNodeId(dto.parent_id) : null,
    kind: dto.kind,
    name: dto.name,
    relPath: dto.rel_path,
    sizeBytes: dto.size_bytes,
    fileCount: dto.file_count,
  };
}

function toMessage(dto: EventDto): ChatMessage {
  return {
    id: dto.id,
    sessionId: asSessionId(dto.session_id),
    kind: dto.kind,
    role: dto.role,
    content: dto.content,
    createdAt: dto.created_at,
  };
}

export interface GitRepo {
  relPath: string;
  branch: string;
  dirty: boolean;
  url: string | null;
}

interface GitDto {
  rel_path: string;
  branch: string;
  dirty?: boolean;
  url?: string | null;
}

interface HomeDto {
  name: string;
  kind: 'folder' | 'file';
  rel_path: string;
  linked?: boolean;
  inherited?: boolean;
  excluded?: boolean;
  size_bytes?: number;
}

const homeInflight = new Map<string, Promise<HomeEntry[]>>();
const homeCache = new Map<string, { at: number; items: HomeEntry[] }>();
const HOME_TTL_MS = 8000;

function homeKey(relPath: string, workspaceId?: string, opts?: { hidden?: boolean; size?: boolean }): string {
  return JSON.stringify([relPath, workspaceId ?? '', Boolean(opts?.hidden), Boolean(opts?.size)]);
}

function mapHome(item: HomeDto): HomeEntry {
  return {
    name: item.name,
    kind: item.kind,
    relPath: item.rel_path,
    linked: Boolean(item.linked),
    inherited: Boolean(item.inherited),
    excluded: Boolean(item.excluded),
    sizeBytes: item.size_bytes ?? 0,
  };
}

function invalidateHomeCache(): void {
  homeCache.clear();
  homeInflight.clear();
}

export const workspaceApi = {
  async listGit(workspaceId: string): Promise<GitRepo[]> {
    const result = await apiClient.call<{ items: GitDto[] }>('workspace', 'list_git', {
      workspace_id: workspaceId,
    });
    return (result.items ?? []).map((item) => ({
      relPath: item.rel_path,
      branch: item.branch,
      dirty: Boolean(item.dirty),
      url: item.url ?? null,
    }));
  },

  async ensureHome(): Promise<string> {
    const result = await apiClient.call<{ home: string }>('workspace', 'ensure_home', {});
    return result.home;
  },

  async listHome(
    relPath: string,
    workspaceId?: string,
    opts?: { hidden?: boolean; size?: boolean },
  ): Promise<HomeEntry[]> {
    const key = homeKey(relPath, workspaceId, opts);
    const cached = homeCache.get(key);
    if (cached && Date.now() - cached.at < HOME_TTL_MS) {
      return cached.items;
    }
    const pending = homeInflight.get(key);
    if (pending) {
      return pending;
    }
    const request = apiClient
      .call<{ items: HomeDto[] }>('workspace', 'list_home', {
        rel_path: relPath,
        workspace_id: workspaceId ?? null,
        include_hidden: Boolean(opts?.hidden),
        include_size: Boolean(opts?.size),
      })
      .then((result) => {
        const items = (result.items ?? []).map(mapHome);
        homeCache.set(key, { at: Date.now(), items });
        return items;
      })
      .finally(() => {
        homeInflight.delete(key);
      });
    homeInflight.set(key, request);
    return request;
  },

  async linkHome(workspaceId: string, relPath: string): Promise<WsNode> {
    const dto = await apiClient.call<NodeDto>('workspace', 'link_home_path', {
      workspace_id: workspaceId,
      rel_path: relPath,
    });
    invalidateHomeCache();
    return toNode(dto);
  },

  async unlinkHome(workspaceId: string, relPath: string): Promise<void> {
    await apiClient.call('workspace', 'unlink_home_path', {
      workspace_id: workspaceId,
      rel_path: relPath,
    });
    invalidateHomeCache();
  },

  async createHome(name: string, parentRel: string, kind: 'folder' | 'file'): Promise<HomeEntry> {
    const dto = await apiClient.call<HomeDto>('workspace', 'create_home_path', {
      name,
      parent_rel: parentRel,
      kind,
    });
    invalidateHomeCache();
    return {
      name: dto.name,
      kind: dto.kind,
      relPath: dto.rel_path,
      linked: Boolean(dto.linked),
      inherited: Boolean(dto.inherited),
      excluded: Boolean(dto.excluded),
      sizeBytes: dto.size_bytes ?? 0,
    };
  },

  async refreshHome(workspaceId?: string): Promise<void> {
    await apiClient.call('workspace', 'refresh_home', {
      workspace_id: workspaceId ?? null,
    });
    invalidateHomeCache();
  },

  async homeStat(relPath: string): Promise<{ kind: 'folder' | 'file'; childCount: number }> {
    const result = await apiClient.call<{ kind: 'folder' | 'file'; child_count: number }>(
      'workspace',
      'home_stat',
      { rel_path: relPath },
    );
    return { kind: result.kind, childCount: result.child_count };
  },

  async moveHome(src: string, destDir: string, workspaceId?: string): Promise<string> {
    const result = await apiClient.call<{ rel_path: string }>('workspace', 'move_home_path', {
      src,
      dest_dir: destDir,
      workspace_id: workspaceId ?? null,
    });
    invalidateHomeCache();
    return result.rel_path;
  },

  async renameHome(src: string, newName: string, workspaceId?: string): Promise<string> {
    const result = await apiClient.call<{ rel_path: string }>('workspace', 'rename_home_path', {
      src,
      new_name: newName,
      workspace_id: workspaceId ?? null,
    });
    invalidateHomeCache();
    return result.rel_path;
  },

  async excludeHome(workspaceId: string, relPath: string): Promise<void> {
    await apiClient.call('workspace', 'exclude_home_path', {
      workspace_id: workspaceId,
      rel_path: relPath,
    });
    invalidateHomeCache();
  },

  async includeHome(workspaceId: string, relPath: string): Promise<void> {
    await apiClient.call('workspace', 'include_home_path', {
      workspace_id: workspaceId,
      rel_path: relPath,
    });
    invalidateHomeCache();
  },

  async trashHome(relPath: string, workspaceId?: string): Promise<void> {
    await apiClient.call('workspace', 'trash_home_path', {
      rel_path: relPath,
      workspace_id: workspaceId ?? null,
    });
    invalidateHomeCache();
  },

  async trashNode(workspaceId: string, nodeId: string): Promise<void> {
    await apiClient.call('workspace', 'trash_node', {
      workspace_id: workspaceId,
      node_id: nodeId,
    });
    invalidateHomeCache();
  },

  async list(): Promise<Workspace[]> {
    const result = await apiClient.call<{ items: WorkspaceDto[] }>('workspace', 'list_workspaces', {});
    return (result.items ?? []).map(toWorkspace);
  },

  async create(name: string, folders: string[]): Promise<Workspace> {
    const dto = await apiClient.call<WorkspaceDto>('workspace', 'create_workspace', {
      name,
      folders: folders.length ? folders : null,
    });
    return toWorkspace(dto);
  },

  async remove(workspaceId: string): Promise<void> {
    await apiClient.call('workspace', 'delete_workspace', { workspace_id: workspaceId });
  },

  async get(workspaceId: string): Promise<Workspace> {
    const dto = await apiClient.call<WorkspaceDto>('workspace', 'get_workspace', {
      workspace_id: workspaceId,
    });
    return toWorkspace(dto);
  },

  async listNodes(workspaceId: string, parentId: string | null): Promise<WsNode[]> {
    const result = await apiClient.call<{ items: NodeDto[] }>('workspace', 'list_nodes', {
      workspace_id: workspaceId,
      parent_id: parentId,
    });
    return (result.items ?? []).map(toNode);
  },

  async createFolder(workspaceId: string, name: string, parentId: string | null): Promise<WsNode> {
    const dto = await apiClient.call<NodeDto>('workspace', 'create_folder', {
      workspace_id: workspaceId,
      name,
      parent_id: parentId,
    });
    return toNode(dto);
  },

  async createFile(workspaceId: string, name: string, parentId: string | null): Promise<WsNode> {
    const dto = await apiClient.call<NodeDto>('workspace', 'create_file', {
      workspace_id: workspaceId,
      name,
      parent_id: parentId,
    });
    return toNode(dto);
  },

  async deleteNode(workspaceId: string, nodeId: string): Promise<void> {
    await apiClient.call('workspace', 'delete_node', { workspace_id: workspaceId, node_id: nodeId });
  },

  async listSessions(workspaceId: string): Promise<WsSession[]> {
    const result = await apiClient.call<{ items: SessionDto[] }>('workspace', 'list_sessions', {
      workspace_id: workspaceId,
    });
    return (result.items ?? []).map(toSession);
  },

  async createSession(workspaceId: string, title: string): Promise<WsSession> {
    const dto = await apiClient.call<SessionDto>('workspace', 'create_session', {
      workspace_id: workspaceId,
      title,
    });
    return toSession(dto);
  },

  async deleteSession(workspaceId: string, sessionId: string): Promise<void> {
    await apiClient.call('workspace', 'delete_session', {
      workspace_id: workspaceId,
      session_id: sessionId,
    });
  },

  async openSession(workspaceId: string, sessionId: string): Promise<WsSession> {
    const dto = await apiClient.call<SessionDto>('workspace', 'open_session', {
      workspace_id: workspaceId,
      session_id: sessionId,
    });
    return toSession(dto);
  },

  async closeSession(workspaceId: string, sessionId: string): Promise<WsSession> {
    const dto = await apiClient.call<SessionDto>('workspace', 'close_session', {
      workspace_id: workspaceId,
      session_id: sessionId,
    });
    return toSession(dto);
  },

  async closeAllTabs(workspaceId: string): Promise<void> {
    await apiClient.call('workspace', 'close_all_tabs', { workspace_id: workspaceId });
  },

  async listMessages(workspaceId: string, sessionId: string): Promise<ChatMessage[]> {
    const result = await apiClient.call<{ items: EventDto[] }>('workspace', 'list_messages', {
      workspace_id: workspaceId,
      session_id: sessionId,
    });
    return (result.items ?? []).map(toMessage).reverse();
  },

  async postMessage(
    workspaceId: string,
    sessionId: string,
    role: string,
    content: string,
  ): Promise<ChatMessage> {
    const dto = await apiClient.call<EventDto>('workspace', 'post_message', {
      workspace_id: workspaceId,
      session_id: sessionId,
      role,
      content,
    });
    return toMessage(dto);
  },
};
