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

interface HomeDto {
  name: string;
  kind: 'folder' | 'file';
  rel_path: string;
  linked?: boolean;
}

export const workspaceApi = {
  async ensureHome(): Promise<string> {
    const result = await apiClient.call<{ home: string }>('workspace', 'ensure_home', {});
    return result.home;
  },

  async listHome(relPath: string, workspaceId?: string): Promise<HomeEntry[]> {
    const result = await apiClient.call<{ items: HomeDto[] }>('workspace', 'list_home', {
      rel_path: relPath,
      workspace_id: workspaceId ?? null,
    });
    return (result.items ?? []).map((item) => ({
      name: item.name,
      kind: item.kind,
      relPath: item.rel_path,
      linked: Boolean(item.linked),
    }));
  },

  async linkHome(workspaceId: string, relPath: string): Promise<WsNode> {
    const dto = await apiClient.call<NodeDto>('workspace', 'link_home_path', {
      workspace_id: workspaceId,
      rel_path: relPath,
    });
    return toNode(dto);
  },

  async unlinkHome(workspaceId: string, relPath: string): Promise<void> {
    await apiClient.call('workspace', 'unlink_home_path', {
      workspace_id: workspaceId,
      rel_path: relPath,
    });
  },

  async trashHome(workspaceId: string, relPath: string): Promise<void> {
    await apiClient.call('workspace', 'trash_home_path', {
      workspace_id: workspaceId,
      rel_path: relPath,
    });
  },

  async trashNode(workspaceId: string, nodeId: string): Promise<void> {
    await apiClient.call('workspace', 'trash_node', {
      workspace_id: workspaceId,
      node_id: nodeId,
    });
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
