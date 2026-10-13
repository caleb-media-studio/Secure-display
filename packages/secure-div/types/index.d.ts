export interface SecureDivPlayback {width:number;height:number;drm:string;destroy():Promise<void>;}
export type SecureDivPlaybackAdapter=(video:HTMLVideoElement,signal:AbortSignal,assetId:string,sourceSha256:string)=>Promise<SecureDivPlayback>;
export declare class SecureDiv extends HTMLElement {}
export declare function registerSecureDiv(adapter:SecureDivPlaybackAdapter):void;
export declare function selectionGeometry(host:Element,selection:Selection|null,maxRects?:number):Array<{left:number;top:number;width:number;height:number}>;
export declare function updateSelectionIndicator(root:Element,rects:Array<{left:number;top:number;width:number;height:number}>,doc?:Document):void;
export declare function serializeProtectedChildren(host:Element):string;
export declare function hashProtectedChildren(host:Element):Promise<string>;
