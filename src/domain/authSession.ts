export type AccessToken = string & { readonly __brand: 'AccessToken' };
export type RefreshToken = string & { readonly __brand: 'RefreshToken' };

export interface AuthSession {
  // Токены не держим в объекте — придут cookie с бэка
  username: string | null;
}
