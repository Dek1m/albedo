export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type NodeId = string & { readonly __brand: 'NodeId' };

export interface Workspace {
  id: WorkspaceId;
  name: string;
  description: string | null;
  rootPath: string | null;
  isArchived: boolean;
}

export interface WsSession {
  id: SessionId;
  workspaceId: WorkspaceId;
  title: string;
  tabOpen: boolean;
  agentBusy: boolean;
}

export interface WsNode {
  id: NodeId;
  workspaceId: WorkspaceId;
  parentId: NodeId | null;
  kind: 'folder' | 'file';
  name: string;
  relPath: string;
  sizeBytes: number;
  fileCount: number;
}

export interface HomeEntry {
  name: string;
  kind: 'folder' | 'file';
  relPath: string;
  linked: boolean;
  inherited: boolean;
  excluded: boolean;
  sizeBytes: number;
}

export interface ChatMessage {
  id: string;
  sessionId: SessionId;
  kind: string;
  role: string | null;
  content: string | null;
  createdAt: string;
}

export function asWorkspaceId(value: string): WorkspaceId {
  return value as WorkspaceId;
}

export function asSessionId(value: string): SessionId {
  return value as SessionId;
}

export function asNodeId(value: string): NodeId {
  return value as NodeId;
}

export function sessionHue(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360} 42% 48%)`;
}
