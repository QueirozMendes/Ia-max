export const parameterAliases=Object.freeze({
 ParamMouthOpenY:['ParamMouthOpenY','PARAM_MOUTH_OPEN_Y'],
 ParamMouthForm:['ParamMouthForm','PARAM_MOUTH_FORM'],
 ParamAngleX:['ParamAngleX','PARAM_ANGLE_X'],ParamAngleY:['ParamAngleY','PARAM_ANGLE_Y'],ParamAngleZ:['ParamAngleZ','PARAM_ANGLE_Z'],
 ParamBodyAngleX:['ParamBodyAngleX','PARAM_BODY_ANGLE_X'],ParamBodyAngleY:['ParamBodyAngleY','PARAM_BODY_ANGLE_Y'],ParamBodyAngleZ:['ParamBodyAngleZ','PARAM_BODY_ANGLE_Z'],
 ParamEyeBallX:['ParamEyeBallX','PARAM_EYE_BALL_X'],ParamEyeBallY:['ParamEyeBallY','PARAM_EYE_BALL_Y'],
 ParamBreath:['ParamBreath','PARAM_BREATH']
});
export function resolveParameters(core){
 const count=core.getParameterCount();
 return Object.fromEntries(Object.entries(parameterAliases).map(([name,ids])=>[name,ids.find(id=>{const i=core.getParameterIndex(id);return Number.isInteger(i)&&i>=0&&i<count;})]));
}
