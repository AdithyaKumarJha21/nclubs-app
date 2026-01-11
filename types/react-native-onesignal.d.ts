declare module "react-native-onesignal" {
  type OSDeviceState = {
    userId?: string | null;
    pushToken?: string | null;
    isSubscribed?: boolean;
  };

  const OneSignal: {
    initialize(appId: string): void;

    Notifications: {
      requestPermission(fallbackToSettings?: boolean): Promise<boolean>;
      getPermissionAsync(): Promise<boolean>;
      addEventListener(
        name: "foregroundWillDisplay",
        handler: (event: any) => void
      ): void;
      removeEventListener(
        name: "foregroundWillDisplay",
        handler: (event: any) => void
      ): void;
    };

    User: {
      getDeviceState(): Promise<OSDeviceState | null>;
    };

    // optional debug namespace (safe to omit usage)
    Debug?: {
      setLogLevel(level: number): void;
    };
  };

  export default OneSignal;
}
