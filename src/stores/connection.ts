import { create } from "zustand";

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline";

interface ConnectionStore {
  state: ConnectionState;
  set: (patch: { state: ConnectionState }) => void;
}

export const useConnection = create<ConnectionStore>()((set) => ({
  state: "connecting",
  set: (patch) => set(patch),
}));
