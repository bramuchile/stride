import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GoogleAccount {
  name: string;
  email: string;
  picture_url: string;
}

export function useGoogleAccount() {
  const [account, setAccount] = useState<GoogleAccount | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    invoke<GoogleAccount | null>("get_google_account")
      .then(setAccount)
      .catch(console.error);
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      const result = await invoke<GoogleAccount>("connect_google_account");
      setAccount(result);
    } catch (e) {
      console.error("Google auth failed:", e);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    await invoke("disconnect_google_account");
    setAccount(null);
  };

  return { account, connecting, connect, disconnect };
}
