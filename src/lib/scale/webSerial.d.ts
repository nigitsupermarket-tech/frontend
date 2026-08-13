// frontend/src/lib/scale/webSerial.d.ts
//
// Minimal ambient typings for the Web Serial API. TypeScript's bundled DOM
// lib doesn't ship these yet, so we declare just enough of the surface we
// use. Supported today in Chrome/Edge/Opera on desktop (chrome://flags not
// required) — see https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API

export {};

declare global {
  interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface SerialOptions {
    baudRate: number;
    dataBits?: 7 | 8;
    stopBits?: 1 | 2;
    parity?: "none" | "even" | "odd";
    bufferSize?: number;
    flowControl?: "none" | "hardware";
  }

  interface SerialPort extends EventTarget {
    readonly readable: ReadableStream<Uint8Array> | null;
    readonly writable: WritableStream<Uint8Array> | null;
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    getInfo(): SerialPortInfo;
    addEventListener(
      type: "disconnect",
      listener: (this: SerialPort, ev: Event) => void,
    ): void;
    removeEventListener(
      type: "disconnect",
      listener: (this: SerialPort, ev: Event) => void,
    ): void;
  }

  interface SerialPortRequestOptions {
    filters?: { usbVendorId?: number; usbProductId?: number }[];
  }

  interface Serial extends EventTarget {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
  }

  interface Navigator {
    readonly serial?: Serial;
  }
}
