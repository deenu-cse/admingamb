"use client";

import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";
import { API_PROXY } from "@/lib/api/client";
import { useConnection } from "@/stores/connection";

const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

const common: Partial<ManagerOptions & SocketOptions> = {
  withCredentials: true, // the httpOnly admin access cookie authenticates /admin
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 8000,
  autoConnect: false,
};

/**
 * In proxy mode the login cookies belong to this site, so the staff socket has to reach the API
 * through it too. Rewrites can't carry WebSockets, so it polls. The public /live socket needs no
 * cookie and stays a direct WebSocket.
 */
const staff: { base: string; options: Partial<ManagerOptions & SocketOptions> } = API_PROXY
  ? { base: "", options: { ...common, transports: ["polling"], addTrailingSlash: false } }
  : { base: SOCKET_URL, options: common };

let admin: Socket | null = null;
let live: Socket | null = null;

/** Staff namespace: the bet feed and liability updates. */
export function adminSocket(): Socket {
  if (admin) return admin;
  admin = io(`${staff.base}/admin`, staff.options);
  const set = useConnection.getState().set;
  admin.on("connect", () => set({ state: "connected" }));
  admin.on("disconnect", (reason) => set({ state: reason === "io client disconnect" ? "offline" : "reconnecting" }));
  admin.on("connect_error", () => set({ state: "reconnecting" }));
  admin.io.on("reconnect_failed", () => set({ state: "offline" }));
  admin.connect();
  return admin;
}

export function disconnectAdminSocket(): void {
  admin?.removeAllListeners();
  admin?.disconnect();
  admin = null;
  live?.disconnect();
  live = null;
  useConnection.getState().set({ state: "offline" });
}

/** Public namespace, used to follow one match's score and markets. Returns the unsubscribe function. */
export function watchMatch(matchId: string, onChange: () => void): () => void {
  live ??= io(`${SOCKET_URL}/live`, common);
  const s = live;
  const join = () => s.emit("subscribe", { rooms: [`match:${matchId}`] });
  s.on("connect", join);
  for (const event of ["score:update", "market:update", "match:status", "match:stale"]) s.on(event, onChange);
  if (s.connected) join();
  else s.connect();
  return () => {
    s.emit("unsubscribe", { rooms: [`match:${matchId}`] });
    s.off("connect", join);
    for (const event of ["score:update", "market:update", "match:status", "match:stale"]) s.off(event, onChange);
  };
}
