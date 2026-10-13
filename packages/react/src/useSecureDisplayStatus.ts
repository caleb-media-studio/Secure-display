import {useCallback, useState} from "react";
import type {SecureDivState} from "./SecureDiv.js";

export type SecureDivObservedState = SecureDivState | {state:"loading";drm?:undefined;reason?:undefined};
/**
 * Optional diagnostics for a <SecureDiv>. Render the hook's callback as
 * onSecureStateChange. The protected component works without this hook.
 * An event is diagnostic information, NOT proof of capture exclusion.
 */
export function useSecureDisplayStatus(){
 const [status,setStatus]=useState<SecureDivObservedState>({state:"loading"});
 const onSecureStateChange=useCallback((next:SecureDivState)=>{
  setStatus(next);
 },[]);
 return {status,onSecureStateChange};
}
