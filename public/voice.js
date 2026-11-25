const base = 'Fale somente o texto recebido, em português brasileiro espontâneo, como uma personagem feminina jovem-adulta de anime, com presença humana, calor e personalidade. Timbre leve e luminoso, sem soar infantil, caricatural ou excessivamente agudo. Use ritmo flexível, acentos naturais do português, pequenas pausas quando fizerem sentido e mudanças sutis de energia. Não acrescente palavras, risadas escritas, suspiros artificiais ou comentários. Evite cadência de locução, sussurros forçados e dramatização excessiva.';
const styles = {
  natural: 'Converse de maneira descontraída e atenta, com uma entonação variada e natural.',
  warm: 'Use calor, um sorriso perceptível na voz e uma saudação espontânea, sem exagero.',
  excited: 'Transmita entusiasmo genuíno, com ritmo ligeiramente mais ágil e variação melódica moderada.',
  gentle: 'Use uma entonação serena, respeitosa e empática, sem infantilizar.',
  focused: 'Seja clara, confiante e didática, com pausas breves entre ideias.'
};
export function voiceInstructions(style) {
  return base + ' ' + (Object.hasOwn(styles, style) ? styles[style] : styles.natural);
}
export function splitSpeech(text, limit = 2200) {
  const chunks = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const prefix = rest.slice(0, limit);
    const sentence = Math.max(prefix.lastIndexOf('. '), prefix.lastIndexOf('! '), prefix.lastIndexOf('? '));
    const space = prefix.lastIndexOf(' ');
    let end = sentence >= limit / 2 ? sentence + 1 : space >= limit / 2 ? space : limit;
    if (/[\uD800-\uDBFF]/.test(rest[end - 1]) && /[\uDC00-\uDFFF]/.test(rest[end])) end--;
    chunks.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
