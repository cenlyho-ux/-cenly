const BLOCK_SIZE = 40; // 假设方块大小为40px (对应80rpx)
const L1_TYPES = ['apple', 'banana', 'cherry'];
const L2_TYPES = ['apple', 'banana', 'cherry', 'grape', 'orange', 'pear', 'watermelon', 'strawberry', 'pineapple', 'kiwi', 'avocado', 'coconut', 'lemon', 'peach'];

Page({
  data: {
    currentLevel: 1,
    blocks: [],
    slots: [],
    history: [],
    time: 0,
    timerActive: false,
    shareCount: 0,
    reviveCount: 0,
    showFailModal: false,
    showWinModal: false,
    formattedTime: '0分0秒'
  },

  timer: null,

  onLoad() {
    this.initLevel(1);
  },

  onUnload() {
    this.stopTimer();
  },

  startTimer() {
    this.stopTimer();
    this.setData({ timerActive: true });
    this.timer = setInterval(() => {
      const newTime = this.data.time + 1;
      this.setData({ 
        time: newTime,
        formattedTime: this.formatTime(newTime)
      });
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.setData({ timerActive: false });
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  },

  initLevel(level) {
    const blocks = [];
    let idCounter = 0;
    let typesArray = [];

    if (level === 1) {
      for (let i = 0; i < 2; i++) {
        L1_TYPES.forEach(type => typesArray.push(type, type, type));
      }
    } else {
      const totalPairs = 42;
      for (let i = 0; i < totalPairs; i++) {
        const type = L2_TYPES[Math.floor(Math.random() * L2_TYPES.length)];
        typesArray.push(type, type, type);
      }
    }
    
    typesArray.sort(() => Math.random() - 0.5);

    const screenWidth = wx.getSystemInfoSync().windowWidth;
    const boardWidth = screenWidth * 0.8;
    const boardHeight = 300;
    const offsetX = (screenWidth - boardWidth) / 2;
    const offsetY = 50;

    typesArray.forEach((type) => {
      blocks.push({
        id: idCounter++,
        type: type,
        x: offsetX + Math.random() * (boardWidth - BLOCK_SIZE),
        y: offsetY + Math.random() * (boardHeight - BLOCK_SIZE),
        level: Math.floor(Math.random() * (level === 1 ? 3 : 6)),
        isCovered: false,
        status: 0
      });
    });

    const resetData = {
      currentLevel: level,
      blocks,
      slots: [],
      history: [],
      showFailModal: false,
      showWinModal: false
    };

    if (level === 1) {
      resetData.time = 0;
      resetData.formattedTime = '0分0秒';
      resetData.shareCount = 0;
      resetData.reviveCount = 0;
    }

    this.setData(resetData, () => {
      this.updateCoverStatus();
      this.startTimer();
    });
  },

  updateCoverStatus() {
    const { blocks } = this.data;
    const activeBlocks = blocks.filter(b => b.status === 0);

    activeBlocks.forEach(blockA => {
      let isCovered = false;
      for (let i = 0; i < activeBlocks.length; i++) {
        const blockB = activeBlocks[i];
        if (blockA.id === blockB.id) continue;
        
        if (blockB.level > blockA.level) {
          const overlapX = Math.abs(blockA.x - blockB.x) < BLOCK_SIZE - 4;
          const overlapY = Math.abs(blockA.y - blockB.y) < BLOCK_SIZE - 4;
          if (overlapX && overlapY) {
            isCovered = true;
            break;
          }
        }
      }
      blockA.isCovered = isCovered;
    });

    this.setData({ blocks }, () => {
      this.checkWinCondition();
    });
  },

  checkWinCondition() {
    const { blocks, currentLevel } = this.data;
    if (blocks.length > 0 && blocks.every(b => b.status === 2)) {
      this.stopTimer();
      if (currentLevel === 1) {
        wx.showToast({
          title: '第一关通过！',
          icon: 'success',
          duration: 1500
        });
        setTimeout(() => {
          this.initLevel(2);
        }, 1500);
      } else {
        this.setData({ showWinModal: true });
      }
    }
  },

  handleBlockTap(e) {
    const id = e.currentTarget.dataset.id;
    const { blocks, slots, history } = this.data;
    
    const blockIndex = blocks.findIndex(b => b.id === id);
    const block = blocks[blockIndex];

    if (block.isCovered || block.status !== 0) return;
    if (slots.length >= 7) return;

    // Save history
    const newHistory = [...history, {
      blocks: JSON.parse(JSON.stringify(blocks)),
      slots: JSON.parse(JSON.stringify(slots))
    }];

    block.status = 1;
    slots.push(block);
    slots.sort((a, b) => a.type.localeCompare(b.type));

    this.setData({ blocks, slots, history: newHistory }, () => {
      this.updateCoverStatus();
      this.checkMatch();
    });
  },

  checkMatch() {
    let { slots, blocks } = this.data;
    
    const typeCount = {};
    slots.forEach(slot => {
      typeCount[slot.type] = (typeCount[slot.type] || 0) + 1;
    });

    let matchedType = null;
    for (const type in typeCount) {
      if (typeCount[type] >= 3) {
        matchedType = type;
        break;
      }
    }

    if (matchedType) {
      setTimeout(() => {
        let removedCount = 0;
        slots = slots.filter(slot => {
          if (slot.type === matchedType && removedCount < 3) {
            removedCount++;
            return false;
          }
          return true;
        });
        
        let rc = 3;
        blocks = blocks.map(b => {
          if (b.type === matchedType && b.status === 1 && rc > 0) {
            rc--;
            b.status = 2;
          }
          return b;
        });
        
        this.setData({ slots, blocks }, () => {
          this.checkWinCondition();
        });
      }, 300);
    } else if (slots.length >= 7) {
      this.stopTimer();
      this.setData({ showFailModal: true });
    }
  },

  handleUndo() {
    const { history } = this.data;
    if (history.length === 0) return;
    
    const lastState = history[history.length - 1];
    this.setData({
      blocks: lastState.blocks,
      slots: lastState.slots,
      history: history.slice(0, -1)
    }, () => {
      this.updateCoverStatus();
    });
  },

  handleShuffle() {
    const { blocks, slots, history, currentLevel } = this.data;
    
    const newHistory = [...history, {
      blocks: JSON.parse(JSON.stringify(blocks)),
      slots: JSON.parse(JSON.stringify(slots))
    }];

    const screenWidth = wx.getSystemInfoSync().windowWidth;
    const boardWidth = screenWidth * 0.8;
    const boardHeight = 300;
    const offsetX = (screenWidth - boardWidth) / 2;
    const offsetY = 50;

    const newBlocks = blocks.map(b => {
      if (b.status === 0) {
        b.x = offsetX + Math.random() * (boardWidth - BLOCK_SIZE);
        b.y = offsetY + Math.random() * (boardHeight - BLOCK_SIZE);
        b.level = Math.floor(Math.random() * (currentLevel === 1 ? 3 : 6));
      }
      return b;
    });

    this.setData({
      blocks: newBlocks,
      history: newHistory
    }, () => {
      this.updateCoverStatus();
    });
  },

  onShareAppMessage() {
    return {
      title: '服了没？这游戏太上头了！',
      path: '/pages/game/game',
      success: () => {
        this.handleRevive();
      }
    };
  },

  handleRevive() {
    let { slots, blocks, shareCount, reviveCount } = this.data;
    
    this.setData({
      shareCount: shareCount + 1,
      reviveCount: reviveCount + 1
    });

    if (slots.length >= 3) {
      const removed = slots.splice(slots.length - 3, 3);
      removed.forEach(r => {
        const b = blocks.find(b => b.id === r.id);
        if (b) {
          b.status = 0;
          b.level = 10;
        }
      });
      this.setData({ slots, blocks, showFailModal: false }, () => {
        this.updateCoverStatus();
        this.startTimer();
      });
    }
  },

  restartGame() {
    this.initLevel(1);
  },

  goHome() {
    wx.navigateBack({
      delta: 1
    });
  }
});
