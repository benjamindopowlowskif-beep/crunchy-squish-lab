// Try autoplay, then respect browser gesture requirements and explicit mute.
import './music.css';
const music = document.querySelector('#background-music');
const button = document.querySelector('#music');
const label = document.querySelector('#music-text');
music.volume = 0.55;
let enabled = true;
let waitingForGesture = false;
let revision = 0;
function render() {
  button.setAttribute('aria-pressed', String(enabled));
  label.textContent = enabled ? '音乐开启' : '音乐关闭';
  button.title = `${enabled ? '关闭' : '开启'}背景音乐：奶油云朵`;
}
async function play() {
  const request = ++revision;
  try {
    await music.play();
    if (request !== revision) return;
    waitingForGesture = false;
    render();
  } catch (error) {
    if (request !== revision) return;
    if (error.name === 'NotAllowedError') {
      waitingForGesture = true;
      label.textContent = '音乐待播放';
      button.title = '音乐已开启，点击页面后播放；点击此按钮关闭';
      return;
    }
    waitingForGesture = false;
    enabled = false;
    render();
    label.textContent = '音乐重试';
    button.title = '音乐未能播放，点击重试';
  }
}
button.addEventListener('click', () => {
  ++revision;
  enabled = !enabled;
  waitingForGesture = false;
  render();
  if (!enabled) music.pause();
  else play();
});
function unlock(event) {
  if (!enabled || !waitingForGesture || button.contains(event.target)) return;
  waitingForGesture = false;
  play();
}
document.addEventListener('click', unlock);
document.addEventListener('keydown', unlock);
render();
play();
