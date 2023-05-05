export const TAG_ISO_14443_3: "TAG_ISO_14443_3";
export const TAG_ISO_14443_4: "TAG_ISO_14443_4";
export const KEY_TYPE_A: 96;
export const KEY_TYPE_B: 97;
export const CONNECT_MODE_DIRECT: "CONNECT_MODE_DIRECT";
export const CONNECT_MODE_CARD: "CONNECT_MODE_CARD";
export default Reader;
declare class Reader {
    /**
     * Reverses a copy of a given buffer
     * Does NOT mutate the given buffer, returns a reversed COPY
     * For mutating reverse use native .reverse() method on a buffer instance
     * @param src {Buffer} a Buffer instance
     * @returns {Buffer}
     */
    static reverseBuffer(src: Buffer): Buffer;
    static selectStandardByAtr(atr: any): "TAG_ISO_14443_3" | "TAG_ISO_14443_4";
    constructor(reader: any, logger: any);
    reader: any;
    logger: any;
    connection: any;
    card: any;
    autoProcessing: boolean;
    _aid: any;
    keyStorage: {
        '0': any;
        '1': any;
    };
    pendingLoadAuthenticationKey: {};
    set aid(arg: any);
    get aid(): any;
    get name(): any;
    connect(mode?: string): Promise<any>;
    disconnect(): Promise<any>;
    transmit(data: any, responseMaxLength: any): Promise<any>;
    control(data: any, responseMaxLength: any): Promise<any>;
    loadAuthenticationKey(keyNumber: any, key: any): Promise<any>;
    authenticate(blockNumber: any, keyType: any, key: any, obsolete?: boolean): Promise<boolean>;
    read(blockNumber: any, length: any, blockSize?: number, packetSize?: number, readClass?: number): any;
    write(blockNumber: any, data: any, blockSize?: number): any;
    handleTag(): false | Promise<boolean>;
    handle_Iso_14443_3_Tag(): Promise<boolean>;
    handle_Iso_14443_4_Tag(): Promise<boolean>;
    close(): void;
    toString(): any;
}
