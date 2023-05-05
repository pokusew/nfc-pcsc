export default ACR122Reader;
declare class ACR122Reader extends Reader {
    inAutoPoll(): Promise<void>;
    led(led: any, blinking: any): Promise<void>;
    setBuzzerOutput(enabled?: boolean): Promise<void>;
    setPICC(picc: any): Promise<void>;
}
import Reader from './Reader';
