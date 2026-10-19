export const messages = {
  en: {
    game: 'duck running! Island rally', subtitle: 'Island rally',
    description: 'A physics-driven island race. Sprint, tumble, crash, and get back up.',
    canvas: 'Island circuit. Drag to orbit, scroll to zoom. WASD to drive, Space to start or pause, R to restart.',
    raceProgress: 'Race progress', laps: 'Laps', rank: 'Your place', preparing: 'Getting ready',
    headlineOne: 'Big sea breeze.', headlineTwo: 'Little ducks. Full speed.',
    situation: 'Two laps around the island. Fall down. Get back up.',
    gate: 'Next gate {gate} / 24', progress: 'Course progress', events: 'Falls {falls} · Recoveries {recoveries}\nCrates {crates}',
    obstacles: 'Smash crates. Send barrels flying.', racers: 'Island racers', standings: 'Race standings',
    you: 'You', blue: 'Blue', coral: 'Coral', mint: 'Mint', ready: 'On the grid',
    loadingTitle: 'Bringing the ducks ashore…', loadingEngine: 'Preparing local physics',
    loadingWake: 'Waking up the ducks…', loadingTrack: 'Building the island circuit…', loadingPolicies: 'Preparing sprint, recovery, and celebration…',
    errorTitle: 'The ducks need another moment', retry: 'Reload', loadFailed: 'Loading failed',
    resourceError: 'A local resource could not load. Reload to try again.',
    controls: 'Race controls', drive: 'Steer / accelerate / slow', skills: 'Duck skills',
    sprint: 'Sprint', sprintKey: 'Sprint, Shift key', sprinting: 'Sprinting',
    roll: 'Forward roll', rollKey: 'Forward roll, F key', rolling: 'Rolling',
    recover: 'Get up', recoverKey: 'Get up, M key', auto: 'Autopilot',
    follow: 'Follow duck', overview: 'Circuit view', settings: 'Settings', settingsLabel: 'Settings and controls', settingsTitle: 'Race settings',
    language: 'Language', switchLanguage: '切换为中文', assist: 'Track assist',
    assistNote: 'Helps steer and return to the racing line. Collisions can still cause a fall.',
    startPause: 'Start / pause', slow: 'Slow down', restart: 'Restart race', restartKey: 'Restart race, R key', reset: 'Restart',
    resetCamera: 'Restore follow camera', sources: 'Models and licenses',
    license: 'MicroDuck geometry by Pollen Robotics (CC BY-NC-SA 4.0). Sprint 13194, roll 6098, recovery, and champion dance use existing trained policies. The official policy handles the starting stance. Code and policies use Apache-2.0.',
    previewNote: 'A fixed island circuit with bounded physical assistance.', fullSources: 'Full credits and licenses',
    start: 'Start race', resume: 'Resume race', pause: 'Pause race', pauseParty: 'Pause celebration', resumeParty: 'Resume celebration',
    paused: 'Paused', starting: 'Ready to race', racing: 'Racing', finalStatus: 'Final countdown', ceremony: 'Podium time',
    finalPush: 'Final sprint!', firstFinished: 'First duck across! {seconds} seconds left.', finalSeconds: 'Final {seconds}s',
    hurdleDown: 'Hurdle down. Keep going!', crateBroken: 'Crate smashed. Keep going!',
    rollNote: 'One forward roll, then back to the chase.', recoverNote: 'Getting up. Back to the race.', offTrack: 'A little wide. Find the racing line.',
    podiumTitle: 'Island podium', winnerTitle: 'Champion. Time to dance!', finishedTitle: 'Finish line. Party time!',
    winnerCaption: '{name} takes first place. Cue the victory dance.', dnf: 'Did not finish',
    rankingRule: 'Finishers rank by time. Unfinished racers rank by course progress.',
    zoneStraight: 'Full-throttle straight', zoneS: 'Sea-breeze esses', zoneLighthouse: 'Lighthouse chicane', zoneHairpin: 'Palm hairpin', zoneFinish: 'Finish coast',
  },
  zh: {
    game: 'duck running! 海岛拉力赛', subtitle: '小鸭环岛赛',
    description: 'duck running! 小鸭海岛拉力赛，快跑、翻滚、碰撞，然后爬起来继续。',
    canvas: '海岛赛道。拖动环顾，滚轮缩放。WASD 驾驶，空格开始或暂停，R 重新比赛。',
    raceProgress: '比赛进度', laps: '圈数', rank: '你的排名', preparing: '正在准备',
    headlineOne: '海风很大，', headlineTwo: '小鸭跑得更快。',
    situation: '绕岛两圈，跌倒了就爬起来。', gate: '下一道门 {gate} / 24', progress: '赛程进度',
    events: '跌倒 {falls} · 起身 {recoveries} · 破箱 {crates}', obstacles: '可撞碎木箱，撞飞路桶。', racers: '上岛选手', standings: '小鸭排名',
    you: '你', blue: '海蓝', coral: '珊瑚', mint: '薄荷', ready: '待发车',
    loadingTitle: '正在把小鸭带到岛上…', loadingEngine: '准备本地物理引擎', loadingWake: '正在唤醒机器鸭…',
    loadingTrack: '正在铺设海岛赛道…', loadingPolicies: '正在准备快跑、起身与庆祝动作…',
    errorTitle: '小鸭还没准备好', retry: '重新加载', loadFailed: '加载失败', resourceError: '本地资源未能加载，请重新加载后再试。',
    controls: '比赛操作', drive: '转向 / 加速 / 收速', skills: '小鸭技能', sprint: '冲刺', sprintKey: '冲刺，Shift 键', sprinting: '冲刺中',
    roll: '前滚翻', rollKey: '前滚翻，F 键', rolling: '翻滚中', recover: '起身', recoverKey: '起身，M 键', auto: '自动驾驶',
    follow: '跟随小鸭', overview: '俯瞰赛道', settings: '设置', settingsLabel: '设置与操作说明', settingsTitle: '比赛设置',
    language: '语言', switchLanguage: 'Switch to English', assist: '赛道辅助', assistNote: '辅助转向和回线，碰撞仍可能跌倒。',
    startPause: '开始 / 暂停', slow: '收速', restart: '重新比赛', restartKey: '重新比赛，R 键', reset: '重开', resetCamera: '恢复跟随视角',
    sources: '模型与开源许可',
    license: 'MicroDuck 几何来自 Pollen Robotics（CC BY-NC-SA 4.0）。快跑 13194、前滚翻 6098、起身及冠军舞蹈复用本项目已有训练策略；发车站立采用官方策略。代码与策略许可为 Apache-2.0。',
    previewNote: '当前是固定海岛赛道试玩，带有限物理辅助。', fullSources: '完整来源与许可',
    start: '开始比赛', resume: '继续比赛', pause: '暂停比赛', pauseParty: '暂停庆祝', resumeParty: '继续庆祝', paused: '已暂停',
    starting: '准备发车', racing: '比赛中', finalStatus: '冲线倒计时', ceremony: '颁奖时间', finalPush: '最后冲刺！',
    firstFinished: '第一只小鸭已冲线，还剩 {seconds} 秒。', finalSeconds: '最后 {seconds} 秒', hurdleDown: '路障倒了，继续冲！',
    crateBroken: '木箱碎啦，继续冲！', rollNote: '前滚翻！落地再追。', recoverNote: '爬起来，继续跑。', offTrack: '跑偏了，顺着赛道回来。',
    podiumTitle: '海岛颁奖时间', winnerTitle: '冠军，开跳！', finishedTitle: '冲线，开派对！', winnerCaption: '{name}获得第一名，跳一支胜利舞。',
    dnf: '未完赛', rankingRule: '按完赛时间排名；未完赛选手按赛程进度排列。',
    zoneStraight: '全油门直道', zoneS: '海风S弯', zoneLighthouse: '灯塔减速弯', zoneHairpin: '棕榈发卡', zoneFinish: '冲线海岸',
  },
};

export function preferredLanguage({ search = '', stored, browser = 'en' } = {}) {
  const query = new URLSearchParams(search).get('lang');
  if (query === 'en' || query === 'zh') return query;
  if (stored === 'en' || stored === 'zh') return stored;
  return browser.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function translate(language, key, values = {}) {
  const message = messages[language]?.[key] ?? messages.en[key];
  if (message === undefined) throw new Error(`Unknown translation: ${key}`);
  return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}

let stored;
try { stored = globalThis.localStorage?.getItem('duck-running-language'); } catch { /* Storage may be disabled. */ }
let language = preferredLanguage({ search: globalThis.location?.search, stored, browser: globalThis.navigator?.language });
export const t = (key, values) => translate(language, key, values);
export const racerName = id => t(({ you: 'blue', orange: 'coral', salt: 'mint' })[id] || 'blue');
export const getLanguage = () => language;

export function setLanguage(next) {
  language = next === 'zh' ? 'zh' : 'en';
  try { localStorage.setItem('duck-running-language', language); } catch { /* Keep the in-memory choice. */ }
  const url = new URL(location.href);
  url.searchParams.set('lang', language);
  history.replaceState(null, '', url);
  applyTranslations();
}

export function applyTranslations() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.querySelector('meta[name="description"]').content = t('description');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel));
  const button = document.querySelector('#language');
  button.textContent = language === 'zh' ? 'EN' : '中文';
  button.setAttribute('aria-label', t('switchLanguage'));
  button.title = t('switchLanguage');
}
