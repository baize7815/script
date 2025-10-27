// ==UserScript==
// @name         BD视频
// @namespace    https://your-namespace.example
// @version      1.1.0
// @description BD视频完整功能：清晰度、字幕、本地字幕、倍速、自定义倍速、播放列表、音量增益、画面比例、滤镜、热键、设置持久化
// @match        http*://yun.baidu.com/s/*
// @match        https://pan.baidu.com/s/*
// @match        https://pan.baidu.com/wap/home*
// @match        https://pan.baidu.com/play/video*
// @match        https://pan.baidu.com/pfile/video*
// @match        https://pan.baidu.com/pfile/mboxvideo*
// @match        https://pan.baidu.com/mbox/streampage*
// @icon         https://nd-static.bdstatic.com/business-static/pan-center/images/vipIcon/user-level2-middle_4fd9480.png
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  const Loader = (() => {
    const instances = {};
    const loadJs = (src) => {
      if (instances[src]) return instances[src];
      instances[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.type = 'text/javascript';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return instances[src];
    };
    const readyHls = () =>
      (window.Hls || unsafeWindow.Hls)
        ? Promise.resolve()
        : loadJs('https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.6.7/hls.min.js');
    const readyArtplayer = () =>
      (window.Artplayer || unsafeWindow.Artplayer)
        ? Promise.resolve()
        : loadJs('https://cdnjs.cloudflare.com/ajax/libs/artplayer/5.2.3/artplayer.min.js');
    return {
      ready: () => Promise.all([readyHls(), readyArtplayer()]),
    };
  })();

  /*************************************************
   * 通用工具与状态
   *************************************************/
  const State = {
    videoPage: {
      flag: '',
      file: {},
      filelist: [],
      quality: [],
      adToken: '',
      getUrl: () => '',
    },
    nodeRef: null,
  };

  const Tools = {
    delay: (ms = 500) => new Promise((r) => setTimeout(r, ms)),
    ready: (state = 3) =>
      new Promise((resolve) => {
        const states = ['uninitialized', 'loading', 'loaded', 'interactive', 'complete'];
        state = Math.min(state, states.length - 1);
        if (states.indexOf(document.readyState) >= state) {
          setTimeout(resolve);
        } else {
          document.onreadystatechange = function () {
            if (states.indexOf(document.readyState) >= state) {
              document.onreadystatechange = null;
              setTimeout(resolve);
            }
          };
        }
      }),
    getVip() {
      const uw = unsafeWindow;
      if (uw.yunData && !uw.yunData.neglect) {
        return (uw.yunData.ISSVIP === 1) ? 2 : (uw.yunData.ISVIP === 1) ? 1 : 0;
      }
      if (uw.locals) {
        try {
          const is_svip = +(
            uw.locals.get ? uw.locals.get('is_svip') : uw.locals.is_svip
          ) === 1;
          const is_vip = +(
            uw.locals.get ? uw.locals.get('is_vip') : uw.locals.is_vip
          ) === 1;
          return is_svip ? 2 : is_vip ? 1 : 0;
        } catch (_) { /* noop */ }
      }
      return 0;
    },
    getShareId: () => {
      return (/baidu.com\/(?:s\/1|(?:share|wap)\/init\?surl=)([\w-]{5,25})/i.exec(location.href) || [])[1] || '';
    },
    tip(msg, mode = 'success', durtime = 3000) {
      const uw = unsafeWindow;
      try {
        if (uw.require) {
          uw.require('system-core:system/uiService/tip/tip.js')
            .show({ vipType: 'svip', mode, msg });
          return;
        }
        if (uw.toast) {
          uw.toast.show({
            type: ['caution', 'failure'].includes(mode) ? 'wide' : 'svip',
            message: msg,
            duration: durtime,
          });
          return;
        }
        if (uw.$bus) {
          uw.$bus.$Toast.addToast({
            type: { caution: 'tip', failure: 'error' }[mode] || mode,
            content: msg,
            durtime,
          });
          return;
        }
        if (uw.VueApp) {
          uw.VueApp.$Toast.addToast({
            type: { caution: 'tip', failure: 'error' }[mode] || mode,
            content: msg,
            durtime,
          });
          return;
        }
      } catch (_) { /* noop */ }
      console.log('[TIP]', mode, msg);
    },
  };

  /*************************************************
   * 清晰度构建（根据分辨率推断 + 非SVIP回落）
   *************************************************/
  function buildQualityList(file, getUrl, adToken) {
    const templates = {
      1080: '超清 1080P',
      720: '高清 720P',
      480: '流畅 480P',
      360: '省流 360P',
    };
    const resolution = (file || {}).resolution || '';
    const freeList = (() => {
      const t = [480, 360];
      const m = resolution.match(/width:(\d+),height:(\d+)/) || ['', '', ''];
      const pixels = +m[1] * +m[2];
      if (!pixels) return t;
      if (pixels > 409920) t.unshift(720);
      if (pixels > 921600) t.unshift(1080);
      return t;
    })();
    return freeList.map((template, index) => ({
      html: templates[template],
      url: getUrl(`M3U8_AUTO_${template}`) + `&adToken=${encodeURIComponent(adToken || '')}`,
      default: index === 0,
      type: 'hls',
    }));
  }

  /*************************************************
   * 获取广告令牌（保留逻辑，不做付费校验）
   *************************************************/
  async function resolveAdToken(getUrl) {
    try {
      const vip = Tools.getVip();
      if (vip > 1) return ''; // SVIP不需要
      const url = getUrl('M3U8_AUTO_480');
      const text = await fetch(url).then((r) => r.text());
      let json;
      try { json = JSON.parse(text); } catch (_) { json = null; }
      if (json && json.errno === 133 && json.adTime !== 0) {
        return json.adToken || '';
      }
    } catch (_) { /* noop */ }
    return '';
  }

  /*************************************************
   * 播放器容器替换与销毁原生播放器
   *************************************************/
  async function replacePlayerContainer(flag) {
    const videoNode = document.querySelector('#video-wrap, .vp-video__player, #app .video-content');
    if (!videoNode) {
      await Tools.delay(500);
      return replacePlayerContainer(flag);
    }
    while (videoNode.nextSibling) {
      videoNode.parentNode.removeChild(videoNode.nextSibling);
    }
    let container = document.getElementById('artplayer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'artplayer';
      if (['videoView'].includes(flag)) {
        container.setAttribute('style', 'width: 100%; height: 3.75rem;');
      } else {
        container.setAttribute('style', 'width: 100%; height: 100%;');
      }
      State.nodeRef = videoNode.parentNode.replaceChild(container, videoNode);
      container.parentNode.style.cssText += 'z-index: auto;';
    }
  }

  function destroyNativePlayer(flag) {
    const uw = unsafeWindow;
    if (['sharevideo', 'playvideo'].includes(flag)) {
      if (uw.require && uw.require.async) {
        uw.require.async('file-widget-1:videoPlay/context.js', function (context) {
          let base = Date.now();
          const id = setInterval(function () {
            const playerInstance = context && context.getContext()?.playerInstance;
            if (playerInstance && playerInstance.player) {
              clearInterval(id);
              try { playerInstance.player.dispose(); } catch (_) {}
              playerInstance.player = false;
            } else if (Date.now() - base > 30000) {
              clearInterval(id);
            }
          }, 500);
        });
      }
    } else if (['video', 'mboxvideo'].includes(flag)) {
      let base = Date.now();
      const id = setInterval(function () {
        const playerInstance = State.nodeRef?.firstChild;
        if (playerInstance && playerInstance.player) {
          clearInterval(id);
          try { playerInstance.player.dispose(); } catch (_) {}
          playerInstance.player = false;
          State.nodeRef = null;
        } else if (Date.now() - base > 30000) {
          clearInterval(id);
          State.nodeRef = null;
        }
      }, 500);
    } else {
      State.nodeRef = null;
    }
  }

  /*************************************************
   * 页面适配：抽取视频信息并生成 getUrl
   *************************************************/
  async function resolveShareVideo() {
    const uw = unsafeWindow;
    if (!uw.require) return;
    uw.locals.get('file_list', 'share_uk', 'shareid', 'sign', 'timestamp', function (file_list, share_uk, shareid, sign, timestamp) {
      if (Array.isArray(file_list) && file_list.length === 1 && file_list[0].category === 1) {
        const file = file_list[0];
        const vip = Tools.getVip();
        State.videoPage.flag = 'sharevideo';
        State.videoPage.file = file;
        State.videoPage.getUrl = function (type) {
          return `/share/streaming?channel=chunlei&uk=${share_uk}&fid=${file.fs_id}&sign=${sign}&timestamp=${timestamp}&shareid=${shareid}&type=${type}&vip=${vip}&jsToken=${uw.jsToken}`;
        };
        resolveAndInit();
      } else {
        try {
          const currentList = uw.require('system-core:context/context.js').instanceForSystem.list.getCurrentList();
          if (currentList.length) {
            sessionStorage.setItem(Tools.getShareId(), JSON.stringify(currentList));
          }
        } catch (_) { /* noop */ }
      }
    });
  }

  function listenAjaxForPlayVideo() {
    const uw = unsafeWindow;
    if (!uw.jQuery) return;
    uw.jQuery(document).ajaxComplete(function (event, xhr, options) {
      const requestUrl = options.url || '';
      if (requestUrl.indexOf('/api/categorylist') >= 0) {
        const response = xhr.responseJSON;
        State.videoPage.filelist = (response && response.info) || [];
      } else if (requestUrl.indexOf('/api/filemetas') >= 0) {
        const response = xhr.responseJSON;
        if (response && response.info) {
          const file = response.info[0];
          const vip = Tools.getVip();
          State.videoPage.flag = 'playvideo';
          State.videoPage.file = file;
          State.videoPage.getUrl = function (type) {
            let t = type;
            if (t.includes(1080) && vip <= 1) t = t.replace(1080, 720);
            return `/api/streaming?path=${encodeURIComponent(file.path)}&app_id=250528&clienttype=0&type=${t}&vip=${vip}&jsToken=${uw.jsToken}`;
          };
          resolveAndInit();
        }
      }
    });
  }

  async function resolvePfileVideo() {
    const app = document.querySelector('#app')?.__vue_app__?.config?.globalProperties;
    const $pinia = app?.$pinia;
    const $router = app?.$router;
    if ($pinia && $router && Object.keys($pinia.state._rawValue.videoinfo?.videoinfo || {}).length) {
      const { recommendListInfo, videoinfo: { videoinfo } } = $pinia.state._rawValue;
      const { selectionVideoList } = recommendListInfo;
      if (Array.isArray(selectionVideoList) && selectionVideoList.length) {
        State.videoPage.filelist = selectionVideoList;
      } else {
        Object.defineProperty(recommendListInfo, 'selectionVideoList', {
          enumerable: true,
          set(selectionVideoList) {
            State.videoPage.filelist = selectionVideoList;
          },
        });
      }
      const file = videoinfo;
      const vip = Tools.getVip();
      State.videoPage.flag = 'video';
      State.videoPage.file = file;
      State.videoPage.getUrl = function (type) {
        let t = type;
        if (t.includes(1080) && vip <= 1) t = t.replace(1080, 720);
        return `/api/streaming?path=${encodeURIComponent(file.path)}&app_id=250528&clienttype=0&type=${t}&vip=${vip}&jsToken=${unsafeWindow.jsToken}`;
      };
      resolveAndInit();
      $router.isReady().then(function () {
        $router.afterEach(function (to, from) {
          from.fullPath === '/' || from.fullPath === to.fullPath || location.reload();
        });
      });
    } else {
      await Tools.delay(500);
      return resolvePfileVideo();
    }
  }

  async function resolveMboxVideo() {
    const app = document.querySelector('#app')?.__vue_app__?.config?.globalProperties;
    const $pinia = app?.$pinia;
    const $router = app?.$router;
    if ($pinia && $router && Object.keys($pinia.state._rawValue.videoinfo?.videoinfo || {}).length) {
      State.videoPage.flag = 'mboxvideo';
      const file = $pinia.state._rawValue.videoinfo.videoinfo;
      State.videoPage.file = file;
      State.videoPage.getUrl = function (stream_type) {
        const { to, from_uk, msg_id, fs_id, type, trans, ltime } = State.videoPage.file;
        return `/mbox/msg/streaming?to=${to}&from_uk=${from_uk}&msg_id=${msg_id}&fs_id=${fs_id}&type=${type}&stream_type=${stream_type}&trans=${(trans || '')}&ltime=${ltime}`;
      };
      State.videoPage.adToken = file.adToken || '';
      resolveAndInit();
      $router.isReady().then(function () {
        $router.afterEach(function (to, from) {
          from.fullPath === '/' || from.fullPath === to.fullPath || location.reload();
        });
      });
    } else {
      await Tools.delay(500);
      return resolveMboxVideo();
    }
  }

  async function resolveWapVideoView() {
    const vue = document.getElementById('app')?.__vue__;
    if (!vue) return;
    const $router = vue.$router;
    if (!$router) return;
    $router.onReady(function () {
      const { currentRoute } = $router;
      if (currentRoute && currentRoute.name === 'videoView') {
        const videoFile = document.querySelector('.preview-video')?.__vue__?.videoFile;
        if (videoFile) {
          const file = videoFile;
          const vip = Tools.getVip();
          State.videoPage.flag = 'videoView';
          State.videoPage.file = file;
          State.videoPage.getUrl = function (type) {
            let t = type;
            if (t.includes(1080) && vip <= 1) t = t.replace(1080, 720);
            return `/rest/2.0/xpan/file?method=streaming&path=${encodeURIComponent(file.path)}&type=${t}`;
          };
          resolveAndInit();
        }
      }
      $router.afterEach(function (to, from) {
        if (to.name !== from.name) {
          State.videoPage.adToken = '';
          if (to.name === 'videoView') {
            resolveWapVideoView();
          }
        }
      });
    });
  }

  /*************************************************
   * 文件列表增强与默认项标记
   *************************************************/
  function enhanceFileList() {
    const { flag, file, filelist } = State.videoPage;
    if (['sharevideo'].includes(flag)) {
      const currentList = JSON.parse(sessionStorage.getItem(Tools.getShareId()) || '[]');
      if (currentList.length) {
        currentList.forEach((item) => {
          if (item.category === 1) {
            item.name = item.server_filename;
            item.open = function () {
              location.href = `https://pan.baidu.com${location.pathname}?fid=${item.fs_id}`;
            };
            filelist.push(item);
          }
        });
      }
    } else if (['playvideo'].includes(flag)) {
      filelist.forEach((item, index) => {
        item.name = item.server_filename;
        item.open = function () {
          location.href = `https://pan.baidu.com${location.pathname}#/video?path=${encodeURIComponent(item.path)}&t=${index}`;
        };
      });
    } else if (['video'].includes(flag)) {
      filelist.forEach((item) => {
        item.name = item.name || item.server_filename;
        item.open = function () {
          location.href = `https://pan.baidu.com/pfile/video?path=${encodeURIComponent(item.path)}`;
        };
      });
    }
    if (filelist && filelist.length) {
      filelist.sort(sortByName);
      const fileDefault = filelist.find((it) => it.fs_id == file.fs_id);
      if (fileDefault) fileDefault.default = true;
    }
  }

  function sortByName(n, i) {
    const a = n.name.split('.').slice(0, -1).join('.').match(/(\d+)/g);
    const b = i.name.split('.').slice(0, -1).join('.').match(/(\d+)/g);
    if (a && b) {
      for (let k = 0; k < Math.min(a.length, b.length); k++) {
        if (+a[k] > +b[k]) return 1;
        if (+b[k] > +a[k]) return -1;
      }
      return 0;
    }
    return n > i ? 1 : i > n ? -1 : 0;
  }

  /*************************************************
   * 初始化播放器（基础）
   *************************************************/
  async function initPlayerBase() {
    await Loader.ready();
    const Art = window.Artplayer || unsafeWindow.Artplayer;
    const Hls = window.Hls || unsafeWindow.Hls;
    const { file, getUrl } = State.videoPage;

    const adToken = State.videoPage.adToken || await resolveAdToken(getUrl);
    State.videoPage.adToken = adToken;

    const quality = buildQualityList(file, getUrl, adToken);
    State.videoPage.quality = quality;

    await replacePlayerContainer(State.videoPage.flag);
    destroyNativePlayer(State.videoPage.flag);

    const def = quality.find((q) => q.default) || quality[0];
    const poster = (Object.values(file.thumbs || {}).slice(-1)[0] || '').replace(/size=c\d+_u\d+/, 'size=c850_u580');

    const player = new Art({
      container: '#artplayer',
      url: def.url,
      type: 'hls',
      autoplay: true,
      autoPlayback: true,
      aspectRatio: true,
      screenshot: true,
      setting: true,
      hotkey: true,
      fullscreen: true,
      fullscreenWeb: !Art.utils.isMobile,
      pip: !Art.utils.isMobile,
      poster,
      quality,
      customType: {
        hls: (video, url, art) => {
          if (Hls.isSupported()) {
            if (art.hls) art.hls.destroy();
            const hls = new Hls({
              maxBufferLength: 10 * Hls.DefaultConfig.maxBufferLength,
            });
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (evt, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    hls.destroy();
                    art.notice.show = '视频播放异常，请刷新重试';
                }
              }
            });
            art.hls = hls;
            art.on('destroy', () => hls.destroy());
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
          } else {
            alert('不支持的播放格式：m3u8');
            art.notice.show = 'Unsupported playback format: m3u8';
          }
        },
      },
      subtitle: {
        url: '',
        type: 'auto',
        style: {
          color: '#fe9200',
          bottom: '5%',
          fontSize: '25px',
          fontWeight: 400,
          fontFamily: '',
          textShadow: '',
        },
        encoding: 'utf-8',
        escape: false,
      },
    });

    window.__bdpan_player__ = player;
    window.__bdpan_state__ = State;

    Tools.tip('视频播放器已就绪 ...', 'success');

    // 在 ready 后加载 UI 插件，避免只显示“画面比例”
    player.on('ready', () => {
      loadUiPlugins(player);
      bindEnhancements(player);
    });
  }

  /*************************************************
   * UI 插件扩展（在 ready 后挂载）
   *************************************************/
  function loadUiPlugins(player) {
    const State = window.__bdpan_state__;

    // 清晰度切换
    if (Array.isArray(State.videoPage.quality) && State.videoPage.quality.length) {
      const defHtml = (State.videoPage.quality.find(q => q.default) || State.videoPage.quality[0]).html;
      player.controls.update({
        name: 'quality',
        html: defHtml,
        selector: State.videoPage.quality.map(q => ({ ...q })),
        onSelect: (item) => {
          player.switchQuality(item.url);
          player.notice.show = `已切换清晰度：${item.html}`;
          return item.html;
        },
      });
    }

    // 播放列表
    if (Array.isArray(State.videoPage.filelist) && State.videoPage.filelist.length > 1) {
      player.controls.update({
        name: 'playlist',
        html: '播放列表',
        position: 'right',
        selector: State.videoPage.filelist.map(f => ({
          html: f.name,
          open: f.open,
        })),
        onSelect: (item) => {
          if (typeof item.open === 'function') item.open();
          return '播放列表';
        },
      });
    }

    // 字幕设置与本地加载
    player.setting.update({
      name: 'subtitle',
      html: '字幕设置',
      tooltip: '加载或调整字幕',
      selector: [
        { html: '加载本地字幕', value: 'local' },
        { html: '字体大', value: 'big' },
        { html: '字体小', value: 'small' },
        { html: '颜色：橙色', value: 'orange' },
        { html: '颜色：白色', value: 'white' },
      ],
      onSelect: (item) => {
        if (item.value === 'local') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.srt,.vtt';
          input.onchange = () => {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
              const content = e.target.result;
              const isSrt = file.name.toLowerCase().endsWith('.srt');
              const parsed = isSrt ? parseSrt(content) : content;
              player.subtitle.switch({
                content: parsed,
                type: isSrt ? 'srt' : 'vtt',
              });
            };
            reader.readAsText(file, 'utf-8');
          };
          input.click();
        } else if (item.value === 'big') {
          player.subtitle.style({ fontSize: '32px' });
        } else if (item.value === 'small') {
          player.subtitle.style({ fontSize: '18px' });
        } else if (item.value === 'orange') {
          player.subtitle.style({ color: '#fe9200' });
        } else if (item.value === 'white') {
          player.subtitle.style({ color: '#ffffff' });
        }
        return '字幕设置';
      },
    });

    // 倍速
    player.setting.update({
      name: 'speed',
      html: '播放速度',
      tooltip: '任意倍速',
      selector: [
        { html: '0.5x', value: 0.5 },
        { html: '1.0x', value: 1.0, default: true },
        { html: '1.5x', value: 1.5 },
        { html: '2.0x', value: 2.0 },
        { html: '自定义', value: 'custom' },
      ],
      onSelect: (item) => {
        if (item.value === 'custom') {
          const val = prompt('请输入倍速 (0.1 - 16):', player.playbackRate);
          const num = parseFloat(val);
          if (!isNaN(num) && num >= 0.1 && num <= 16) {
            player.playbackRate = num;
            return `${num}x`;
          }
        } else {
          player.playbackRate = item.value;
          return `${item.value}x`;
        }
        return '播放速度';
      },
    });

    // 音量增益
    player.setting.update({
      name: 'sound',
      html: '音效增强',
      tooltip: '音效音量',
      selector: [
       { html: '正常', value: 1, default: true },
       { html: '增强 x1.5', value: 1.5 },
        { html: '增强 x2', value: 2 },
       ],
     onSelect: (item) => {
        const ctx = player.audioContext || new (window.AudioContext || window.webkitAudioContext)();
         if (!player.audioContext) {
         const source = ctx.createMediaElementSource(player.video);
         const gainNode = ctx.createGain();
         source.connect(gainNode).connect(ctx.destination);
         player.audioContext = ctx;
         player.gainNode = gainNode;
       }
         player.gainNode.gain.value = item.value;
         return `音量 x${item.value}`;
     },
     });

    // 画面比例/滤镜
    player.setting.update({
      name: 'filter',
      html: '画面调整',
      tooltip: '比例/滤镜',
      selector: [
        { html: '默认', value: 'none', default: true },
        { html: '4:3', value: 'aspect43' },
        { html: '16:9', value: 'aspect169' },
        { html: '黑白', value: 'grayscale' },
        { html: '高对比度', value: 'contrast' },
      ],
      onSelect: (item) => {
        const video = player.video;
        video.style.filter = '';
        video.style.objectFit = 'contain';
        if (item.value === 'aspect43') {
          video.style.aspectRatio = '4/3';
        } else if (item.value === 'aspect169') {
          video.style.aspectRatio = '16/9';
        } else if (item.value === 'grayscale') {
          video.style.filter = 'grayscale(100%)';
        } else if (item.value === 'contrast') {
          video.style.filter = 'contrast(150%)';
        } else {
          video.style.aspectRatio = '';
        }
        return '画面调整';
      },
    });

    // 热键
    player.on('keydown', (evt) => {
      if (evt.code === 'ArrowUp') {
        player.volume = Math.min(1, player.volume + 0.05);
        player.notice.show = `音量：${Math.round(player.volume * 100)}%`;
      } else if (evt.code === 'ArrowDown') {
        player.volume = Math.max(0, player.volume - 0.05);
        player.notice.show = `音量：${Math.round(player.volume * 100)}%`;
      } else if (evt.code === 'ArrowRight') {
        player.currentTime += 5;
      } else if (evt.code === 'ArrowLeft') {
        player.currentTime -= 5;
      } else if (evt.code === 'Space') {
        player.toggle();
      }
    });
  }

  /*************************************************
   * 字幕解析、样式持久化、事件绑定（增强）
   *************************************************/
  function bindEnhancements(player) {
    // SRT 解析成 WebVTT 或通用文本（Artplayer可识别srt/vtt）
    function toSeconds(t) {
      const [h, m, rest] = t.split(':');
      const [s, ms] = rest.split(',');
      return (+h) * 3600 + (+m) * 60 + (+s) + (+ms) / 1000;
    }
    window.parseSrt = function parseSrt(data) {
      const lines = data.split(/\r?\n/);
      const out = [];
      let i = 0;
      while (i < lines.length) {
        const maybeIndex = lines[i++].trim();
        if (!maybeIndex) continue;
        const timeLine = lines[i++]?.trim() || '';
        const match = timeLine.match(/(\d+:\d+:\d+,\d+)\s*-->\s*(\d+:\d+:\d+,\d+)/);
        if (!match) continue;
        let text = '';
        while (i < lines.length && lines[i].trim()) {
          text += lines[i++] + '\n';
        }
        out.push(`${match[1].replace(',', '.')} --> ${match[2].replace(',', '.')}\n${text.trim()}`);
      }
      // 返回接近 VTT 的格式，Artplayer 可直接吃
      return `WEBVTT\n\n${out.join('\n\n')}`;
    };

    const STORAGE_KEY = '__bdpan_player_settings__';
    function saveSetting(key, value) {
      const obj = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      obj[key] = value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }
    function loadSetting(key, def) {
      const obj = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return obj[key] !== undefined ? obj[key] : def;
    }

    // 恢复倍速
    const savedSpeed = loadSetting('speed', 1.0);
    if (savedSpeed && savedSpeed !== 1.0) {
      player.playbackRate = savedSpeed;
    }
    player.on('ratechange', () => {
      saveSetting('speed', player.playbackRate);
    });

    // 恢复音量增益
    const savedGain = loadSetting('gain', 1.0);
    if (savedGain && savedGain !== 1.0 && player.gainNode) {
      player.gainNode.gain.value = savedGain;
    }
    player.on('volumechange', () => {
      if (player.gainNode) saveSetting('gain', player.gainNode.gain.value);
    });

    // 恢复字幕样式
    const savedSubtitleStyle = loadSetting('subtitleStyle', null);
    if (savedSubtitleStyle) {
      player.subtitle.style(savedSubtitleStyle);
    }
    player.on('subtitleUpdate', () => {
      saveSetting('subtitleStyle', player.subtitle.style());
    });

    // 结束/错误/清晰度提示
    player.on('video:ended', () => {
      player.notice.show = '播放结束';
    });
    player.on('error', (err) => {
      console.error('播放错误', err);
      player.notice.show = '播放出错，请尝试切换清晰度或刷新';
    });
    player.on('qualityChange', (q) => {
      player.notice.show = `已切换清晰度：${q.html}`;
    });
  }

  /*************************************************
   * 统一入口：抽取、增强、初始化
   *************************************************/
  async function resolveAndInit() {
    enhanceFileList();
    await initPlayerBase();
  }

  /*************************************************
   * 路由：根据 URL 决定流程
   *************************************************/
  function bootstrap() {
    const url = location.href;
    if (url.indexOf('.baidu.com/s/') > 0) {
      Tools.ready().then(resolveShareVideo);
    } else if (url.indexOf('.baidu.com/play/video#/video') > 0) {
      Tools.ready().then(listenAjaxForPlayVideo);
      window.onhashchange = function () {
        location.reload();
      };
    } else if (url.indexOf('.baidu.com/pfile/video') > 0) {
      Tools.ready().then(resolvePfileVideo);
    } else if (url.indexOf('.baidu.com/pfile/mboxvideo') > 0) {
      Tools.ready().then(resolveMboxVideo);
    } else if (url.indexOf('.baidu.com/wap') > 0) {
      Tools.ready(4).then(resolveWapVideoView);
    }
  }

  bootstrap();
  console.log('=== 百度网盘视频播放器（合并免费完整版）- 单文件版 ===');
})();
