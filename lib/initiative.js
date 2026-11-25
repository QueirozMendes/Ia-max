// Local, deterministic gate for proactive interaction. No sensor access here.
export function decideInitiative(state, now = Date.now()) {
  if (!state.enabled || state.quiet || state.locked || state.sensitive || state.speaking || state.listening || state.busy) return null;
  const sinceSpeech = now - (state.lastSpeechAt || 0);
  const sinceActivity = now - (state.lastActivityAt || 0);
  if (sinceSpeech < 180000 || state.unanswered >= 2) return null;
  if (state.screenConsent && state.observationChanged && sinceActivity < 60000) return 'contextual-tip';
  if (sinceActivity >= 600000 && sinceSpeech >= 900000) return 'playful-check-in';
  return null;
}
export function mayExecute(action, permissions = {}, confirmed = false) {
  if (permissions.paused) return false;
  switch (action) {
    case 'observe-screen': return permissions.screen === true;
    case 'listen-microphone': return permissions.microphone === true;
    case 'speak': return permissions.initiative === true && !permissions.quiet;
    case 'cursor-nudge': return permissions.cursorPlay === true && permissions.idle === true && !permissions.quiet;
    case 'click': case 'type': case 'edit-project': case 'run-command':
      return permissions[action] === true && confirmed === true;
    default: return false;
  }
}
