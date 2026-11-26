// Session grants are held only in the desktop process and reset on lock/suspend.
export function sensorPermission(permission,types,{microphone=false,camera=false,screen=false}={}){
 if(permission==='display-capture')return screen===true;
 if(permission!=='media'||!Array.isArray(types)||!types.length)return false;
 return types.every(type=>type==='audio'?microphone===true:type==='video'?camera===true:false);
}
