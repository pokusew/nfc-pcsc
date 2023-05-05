export default NFC;
declare class NFC {
    constructor(logger: any);
    pcsc: any;
    logger: any;
    get readers(): any;
    close(): void;
}
