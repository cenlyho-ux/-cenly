/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Share2, RotateCcw, Home, Undo, Shuffle, Timer } from 'lucide-react';

const BLOCK_SIZE = 48;
const L1_TYPES = ['🍎', '🍌', '🍇'];
const L2_TYPES = ['🍎', '🍌', '🍇', '🍉', '🍊', '🍓', '🍒', '🍍', '🍅', '🍆', '🌽', '🥕', '🍄', '🍔'];

interface Block {
  id: number;
  type: string;
  x: number;
  y: number;
  level: number;
  isCovered: boolean;
  status: number; // 0: board, 1: slot, 2: removed
}

interface GameState {
  blocks: Block[];
  slots: Block[];
}

export default function App() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [slots, setSlots] = useState<Block[]>([]);
  const [history, setHistory] = useState<GameState[]>([]);
  
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [reviveCount, setReviveCount] = useState(0);
  
  const [showFailModal, setShowFailModal] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);

  // Timer
  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  const initLevel = (level: number) => {
    const newBlocks: Block[] = [];
    let idCounter = 0;
    let typesArray: string[] = [];

    if (level === 1) {
      // Level 1: 3 types, 2 sets each = 18 blocks (very easy)
      for (let i = 0; i < 2; i++) {
        L1_TYPES.forEach(type => typesArray.push(type, type, type));
      }
    } else {
      // Level 2: 14 types, many sets = 126 blocks (hard)
      const totalPairs = 42; 
      for (let i = 0; i < totalPairs; i++) {
        const type = L2_TYPES[Math.floor(Math.random() * L2_TYPES.length)];
        typesArray.push(type, type, type);
      }
    }
    typesArray.sort(() => Math.random() - 0.5);

    const boardWidth = 300;
    const boardHeight = 300;

    typesArray.forEach((type) => {
      newBlocks.push({
        id: idCounter++,
        type,
        x: Math.random() * (boardWidth - BLOCK_SIZE),
        y: Math.random() * (boardHeight - BLOCK_SIZE),
        level: Math.floor(Math.random() * (level === 1 ? 3 : 6)),
        isCovered: false,
        status: 0,
      });
    });

    setCurrentLevel(level);
    setBlocks(newBlocks);
    setSlots([]);
    setHistory([]);
    setShowFailModal(false);
    setShowWinModal(false);
    
    if (level === 1) {
      setTime(0);
      setShareCount(0);
      setReviveCount(0);
    }
    setTimerActive(true);
  };

  useEffect(() => {
    initLevel(1);
  }, []);

  // Update covered status
  useEffect(() => {
    setBlocks((prevBlocks) => {
      const activeBlocks = prevBlocks.filter((b) => b.status === 0);
      const updatedBlocks = prevBlocks.map((blockA) => {
        if (blockA.status !== 0) return blockA;

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
        return { ...blockA, isCovered };
      });
      return updatedBlocks;
    });
  }, [slots]);

  // Win condition
  useEffect(() => {
    if (blocks.length > 0 && blocks.every(b => b.status === 2)) {
      if (currentLevel === 1) {
        setTimeout(() => {
          alert('第一关通过！准备迎接地狱难度...');
          initLevel(2);
        }, 500);
      } else {
        setShowWinModal(true);
        setTimerActive(false);
      }
    }
  }, [blocks, currentLevel]);

  const handleBlockTap = (id: number) => {
    const block = blocks.find((b) => b.id === id);
    if (!block || block.isCovered || block.status !== 0 || slots.length >= 7) return;

    setHistory(prev => [...prev, { blocks, slots }]);

    const newSlots = [...slots, { ...block, status: 1 }];
    newSlots.sort((a, b) => a.type.localeCompare(b.type));

    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, status: 1 } : b)));
    setSlots(newSlots);
  };

  // Check match
  useEffect(() => {
    if (slots.length === 0) return;

    const typeCount: Record<string, number> = {};
    slots.forEach((slot) => {
      typeCount[slot.type] = (typeCount[slot.type] || 0) + 1;
    });

    let matchedType: string | null = null;
    for (const type in typeCount) {
      if (typeCount[type] >= 3) {
        matchedType = type;
        break;
      }
    }

    if (matchedType) {
      const timer = setTimeout(() => {
        let removedCount = 0;
        const newSlots = slots.filter((slot) => {
          if (slot.type === matchedType && removedCount < 3) {
            removedCount++;
            return false;
          }
          return true;
        });

        setSlots(newSlots);
        setBlocks((prev) => {
          let rc = 3;
          return prev.map((b) => {
            if (b.type === matchedType && b.status === 1 && rc > 0) {
              rc--;
              return { ...b, status: 2 };
            }
            return b;
          });
        });
      }, 300);
      return () => clearTimeout(timer);
    } else if (slots.length >= 7) {
      setShowFailModal(true);
      setTimerActive(false);
    }
  }, [slots]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setBlocks(lastState.blocks);
    setSlots(lastState.slots);
    setHistory(history.slice(0, -1));
  };

  const handleShuffle = () => {
    setHistory(prev => [...prev, { blocks, slots }]);
    setBlocks(prev => {
      const boardWidth = 300;
      const boardHeight = 300;
      return prev.map(b => {
        if (b.status === 0) {
          return {
            ...b,
            x: Math.random() * (boardWidth - BLOCK_SIZE),
            y: Math.random() * (boardHeight - BLOCK_SIZE),
            level: Math.floor(Math.random() * (currentLevel === 1 ? 3 : 6))
          };
        }
        return b;
      });
    });
  };

  const handleShare = () => {
    setShareCount(s => s + 1);
    setReviveCount(r => r + 1);
    alert('模拟微信分享成功！已清空最后3个方块。');
    
    if (slots.length >= 3) {
      const removed = slots.slice(-3);
      const remainingSlots = slots.slice(0, -3);
      
      setSlots(remainingSlots);
      setBlocks((prev) =>
        prev.map((b) => {
          const isRemoved = removed.find((r) => r.id === b.id);
          if (isRemoved) {
            return { ...b, status: 0, level: 10 };
          }
          return b;
        })
      );
      setShowFailModal(false);
      setTimerActive(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#c3e88d] flex flex-col items-center py-6 font-sans">
      <h1 className="text-4xl font-black text-[#4a5d23] mb-4 tracking-widest drop-shadow-md">服了没</h1>
      
      {/* Top Bar */}
      <div className="w-[340px] flex justify-between items-center mb-6 bg-white/40 px-4 py-2 rounded-full shadow-sm border border-white/50">
        <div className="flex items-center gap-2 text-[#4a5d23] font-bold">
          <span className="bg-[#4a5d23] text-white px-2 py-1 rounded-md text-sm">第 {currentLevel} 关</span>
        </div>
        <div className="flex items-center gap-1 text-[#4a5d23] font-mono font-bold">
          <Timer size={18} />
          {formatTime(time)}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleUndo} 
            disabled={history.length === 0}
            className="p-2 bg-white rounded-full shadow-sm text-[#4a5d23] disabled:opacity-50 hover:bg-gray-50 transition-colors"
            title="返回上一步"
          >
            <Undo size={18} />
          </button>
          <button 
            onClick={handleShuffle}
            className="p-2 bg-white rounded-full shadow-sm text-[#4a5d23] hover:bg-gray-50 transition-colors"
            title="打乱"
          >
            <Shuffle size={18} />
          </button>
        </div>
      </div>
      
      {/* Game Board */}
      <div className="relative w-[300px] h-[300px] bg-white/20 rounded-xl mb-12">
        {blocks.map((block) => {
          if (block.status !== 0) return null;
          return (
            <div
              key={block.id}
              onClick={() => handleBlockTap(block.id)}
              className={`absolute flex items-center justify-center text-2xl rounded-lg cursor-pointer transition-all duration-200 select-none
                ${block.isCovered ? 'brightness-50' : 'hover:-translate-y-1'}
              `}
              style={{
                width: BLOCK_SIZE,
                height: BLOCK_SIZE,
                left: block.x,
                top: block.y,
                zIndex: block.level,
                backgroundColor: '#fff',
                boxShadow: '0 4px 0 #999, 0 6px 10px rgba(0,0,0,0.2)',
                border: '1px solid #ddd',
                fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
              }}
            >
              {block.type}
              {block.isCovered && (
                <div className="absolute inset-0 bg-black/40 rounded-lg pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Slots Area */}
      <div className="w-[360px] h-[64px] bg-white/50 rounded-xl flex items-center px-2 gap-2 border-4 border-[#8b5a2b]">
        {Array.from({ length: 7 }).map((_, i) => {
          const slot = slots[i];
          return (
            <div
              key={i}
              className="w-[44px] h-[44px] bg-white/30 rounded-lg border border-dashed border-[#8b5a2b]/30 flex items-center justify-center"
            >
              {slot && (
                <div
                  className="w-full h-full bg-white rounded-lg flex items-center justify-center text-xl"
                  style={{
                    boxShadow: '0 3px 0 #999',
                    border: '1px solid #ddd',
                    fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
                  }}
                >
                  {slot.type}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fail Modal */}
      {showFailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-[300px] rounded-3xl p-6 flex flex-col items-center shadow-2xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">服了没？</h2>
            <p className="text-gray-500 mb-6 font-mono">本次用时：{formatTime(time)}</p>
            
            <button
              onClick={handleShare}
              className="w-full py-3 bg-[#ff5722] text-white rounded-full font-bold text-lg mb-3 flex items-center justify-center gap-2 hover:bg-[#f44336] transition-colors"
            >
              <Share2 size={20} />
              不服继续
            </button>
            
            <button
              onClick={() => initLevel(1)}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-full font-bold text-lg mb-3 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <RotateCcw size={20} />
              服了 (重开)
            </button>
            
            <button
              onClick={() => alert('返回首页')}
              className="w-full py-3 bg-gray-400 text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-500 transition-colors"
            >
              <Home size={20} />
              不玩了
            </button>
          </div>
        </div>
      )}

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-[300px] rounded-3xl p-6 flex flex-col items-center shadow-2xl">
            <h2 className="text-3xl font-bold text-[#4a5d23] mb-4">过关了！</h2>
            <div className="w-full bg-gray-50 rounded-xl p-4 mb-6 text-center space-y-2">
              <p className="text-gray-600">总用时：<span className="font-bold text-gray-800">{formatTime(time)}</span></p>
              <p className="text-gray-600">分享次数：<span className="font-bold text-gray-800">{shareCount}</span></p>
              <p className="text-gray-600">复活次数：<span className="font-bold text-gray-800">{reviveCount}</span></p>
            </div>
            
            <button
              onClick={() => initLevel(1)}
              className="w-full py-3 bg-[#4a5d23] text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#3a491b] transition-colors"
            >
              <RotateCcw size={20} />
              再玩一次
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-[#4a5d23]/80 text-xs max-w-md px-4">
        <p>💡 提示：这里是 React 预览版。微信小程序原生代码已同步更新。</p>
      </div>
    </div>
  );
}
