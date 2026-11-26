// A spoken turn goes directly to the conversation, never through the draft field.
export function createVoiceInput({canSubmit,submit,feedback,onAccepted=()=>{},continuous=()=>true,stop=()=>{}}){
 let sending=false;
 return async text=>{
  if(typeof text!=='string'||!text.trim())return false;
  if(sending||!canSubmit()){
   feedback('A conversa está ocupada. Aguarde a resposta ou termine o texto que está escrevendo.');
   return false;
  }
  sending=true;
  try{
   onAccepted();
   const response=submit(text.trim());
   if(!continuous())stop();
   await response;
   return true;
  }catch{
   feedback('Não consegui enviar sua fala. Tente novamente.');
   return false;
  }finally{sending=false;}
 };
}
