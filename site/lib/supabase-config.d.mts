export function deduireSupabase(databaseUrl?: string): { ref: string; region: string | undefined } | null;
export function configurationStockage(e?: Record<string, string | undefined>): {
  endpoint: string; region: string; bucket: string; pathStyle: boolean; origine: string;
  accessKeyId: string; secretAccessKey: string; deduit: boolean;
};
