// Independent from squish effects. Only an explicit click starts playback.
import './music.css';
const music = document.querySelector('#background-music');
const button = document.querySelector('#music');
const label = document.querySelector('#music-text');
music.volume = 0.55;
let enabled = false;
let revision = 0;
function render() {
  button.setAttribute('aria-pressed', String(enabled));
  label.textContent = enabled ? '音乐开启' : '音乐关闭';
  button.title = `${enabled ? '关闭' : '开启'}背景音乐：奶油云朵`;
}
button.addEventListener('click', async () => {
  const request = ++revision;
  enabled = !enabled;
  render();
  if (!enabled) { music.pause(); return; }
  try {
    await music.play();
  } catch {
    if (request !== revision) return;
    enabled = false;
    render();
    label.textContent = '音乐重试';
    button.title = '音乐未能播放，点击重试';
  }
});
