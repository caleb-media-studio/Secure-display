export declare function startEncryptedVideo(video:HTMLVideoElement,signal:AbortSignal,sourceSha256:string):Promise<{
 player:{destroy():Promise<void>};
 provider:{type:"widevine"|"fairplay";keySystem:string;manifest:string;license:string;certificate?:string};
 meta:{kind:string;classification:string;assetId:string;width:number;height:number;sourceSha256:string};
}>;
export declare function supportedDRM():{
 type:"widevine"|"fairplay";keySystem:string;manifest:string;license:string;certificate?:string;
};
