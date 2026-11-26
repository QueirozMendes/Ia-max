const cues=[
 ['Angry',/[😠😡🤬😤]/u],['Sad',/[😢😭😞😔🥺😕🙁☹]/u],['Surprised',/[😮😯😲😱🤯😳]/u],
 ['Blushing',/[☺🥰😍😘💕💗❤]/u],['Smile',/[😀😃😄😁😆😅😂🤣😊🙂😉😏😎]/u]
];
export function expressionForText(text){
 const value=String(text||'');
 let expression='Normal',last=-1;
 for(const [name,pattern]of cues){const re=new RegExp(pattern.source,'gu');for(const match of value.matchAll(re)){if(match.index>=last){last=match.index;expression=name;}}}
 if(last>=0)return expression;
 const action=value.match(/(?:\*|\[)(sorri|sorriso|ri|risos|corada|envergonhada|surpresa|assustada|triste|brava|irritada)[^*\]\n]*(?:\*|\])/iu)?.[1]?.toLowerCase();
 return action?/^(sorri|sorriso|ri|risos)$/.test(action)?'Smile':/^(corada|envergonhada)$/.test(action)?'Blushing':/^(surpresa|assustada)$/.test(action)?'Surprised':action==='triste'?'Sad':'Angry':'Normal';
}
export function speechText(text){
 return String(text||'')
  .replace(/```[\s\S]*?```/g,' Veja o trecho de código na tela. ')
  .replace(/\[([^\]]+)\]\(https?:[^)]+\)/g,'$1')
  .replace(/(?:\*|\[)(?:sorri|sorriso|ri|risos|corada|envergonhada|surpresa|assustada|triste|brava|irritada|cruza os braços|mexe no cabelo|acena)\b[^*\]\n]*(?:\*|\])/giu,' ')
  .replace(/[0-9#*]\uFE0F?\u20E3/g,' ')
  .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\u200D\uFE0E\uFE0F\u20E3]/gu,'')
  .replace(/[*#`]/g,'').replace(/[.…]{3,}/g,'.')
  .replace(/([^.!?:;])\s*\n\s*\n/g,'$1. ').replace(/\s+/g,' ').trim();
}
