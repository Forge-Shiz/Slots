/* ============================================
   SLOT UI - Professional Casino Interface
   JavaScript Component
   ============================================ */

class SlotUI {
  constructor(options = {}) {
    this.options = {
      container: options.container || document.body,
      bets: options.bets || [1, 2, 5, 10, 20, 50],
      initialBet: options.initialBet || 10,
      initialBalance: options.initialBalance || 1000,
      accentColor: options.accentColor || '#00d4aa',
      onSpin: options.onSpin || (() => {}),
      onBetChange: options.onBetChange || (() => {}),
      formatCurrency: options.formatCurrency || ((val) => val.toFixed(2)),
      symbols: options.symbols || []
    };

    this.state = {
      balance: this.options.initialBalance,
      bet: this.options.initialBet,
      betIndex: this.options.bets.indexOf(this.options.initialBet),
      lastWin: 0,
      spinning: false,
      soundOn: true
    };

    if (this.state.betIndex === -1) this.state.betIndex = 0;

    this.elements = {};
    this.init();
  }

  init() {
    this.injectStyles();
    this.createBottomBar();
    this.createBetPopup();
    this.createInfoPopup();
    this.createWinDisplay();
    this.createFreespinsBanner();
    this.bindEvents();
    this.updateDisplay();
  }

  injectStyles() {
    if (this.options.accentColor !== '#00d4aa') {
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --sui-accent: ${this.options.accentColor};
          --sui-accent-glow: ${this.options.accentColor}66;
        }
      `;
      document.head.appendChild(style);
    }
  }

  createBottomBar() {
    const bar = document.createElement('div');
    bar.className = 'sui-bottom-bar';
    bar.innerHTML = `
      <div class="sui-stats-row">
        <div class="sui-stat">
          <div class="sui-stat-label">Balance</div>
          <div class="sui-stat-value balance" id="sui-balance">0.00</div>
        </div>
        <div class="sui-stat">
          <div class="sui-stat-label">Win</div>
          <div class="sui-stat-value win" id="sui-win">0.00</div>
        </div>
        <div class="sui-stat">
          <div class="sui-stat-label">Bet</div>
          <div class="sui-stat-value bet" id="sui-bet">0.00</div>
        </div>
      </div>

      <div class="sui-spin-container">
        <button class="sui-spin-btn" id="sui-spin-btn">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        </button>
      </div>

      <div class="sui-controls-row">
        <button class="sui-ctrl-btn" id="sui-bet-btn" title="Change Bet">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
          </svg>
        </button>
        <button class="sui-ctrl-btn" id="sui-sound-btn" title="Toggle Sound">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" id="sui-sound-icon">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
        <button class="sui-ctrl-btn" id="sui-info-btn" title="Game Info">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </button>
      </div>
    `;

    this.options.container.appendChild(bar);

    this.elements.bottomBar = bar;
    this.elements.balanceEl = bar.querySelector('#sui-balance');
    this.elements.winEl = bar.querySelector('#sui-win');
    this.elements.betEl = bar.querySelector('#sui-bet');
    this.elements.spinBtn = bar.querySelector('#sui-spin-btn');
    this.elements.betBtn = bar.querySelector('#sui-bet-btn');
    this.elements.soundBtn = bar.querySelector('#sui-sound-btn');
    this.elements.infoBtn = bar.querySelector('#sui-info-btn');
    this.elements.soundIcon = bar.querySelector('#sui-sound-icon');
  }

  createBetPopup() {
    const popup = document.createElement('div');
    popup.className = 'sui-popup-overlay';
    popup.id = 'sui-bet-popup';

    let betOptionsHtml = this.options.bets.map((bet, index) => `
      <button class="sui-bet-option${index === this.state.betIndex ? ' selected' : ''}" data-index="${index}">
        ${this.options.formatCurrency(bet)}
      </button>
    `).join('');

    popup.innerHTML = `
      <div class="sui-popup">
        <div class="sui-popup-title">Select Bet</div>
        <div class="sui-bet-grid" id="sui-bet-options">
          ${betOptionsHtml}
        </div>
        <button class="sui-popup-close" id="sui-bet-close">Done</button>
      </div>
    `;

    this.options.container.appendChild(popup);
    this.elements.betPopup = popup;
    this.elements.betOptions = popup.querySelector('#sui-bet-options');
    this.elements.betClose = popup.querySelector('#sui-bet-close');
  }

  createInfoPopup() {
    const popup = document.createElement('div');
    popup.className = 'sui-popup-overlay';
    popup.id = 'sui-info-popup';

    let symbolsHtml = '';
    if (this.options.symbols.length > 0) {
      symbolsHtml = `
        <div class="sui-info-section">
          <div class="sui-info-heading">Symbols</div>
          ${this.options.symbols.map(s => `
            <div class="sui-symbol-row">
              <img src="${s.image}" alt="${s.name}">
              <span class="sui-symbol-name">${s.name}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    popup.innerHTML = `
      <div class="sui-popup">
        <div class="sui-popup-title">Game Info</div>
        <div class="sui-info-content" id="sui-info-content">
          <div class="sui-info-section">
            <div class="sui-info-heading">How to Play</div>
            <p class="sui-info-text">Match 3 or more symbols from left to right on the paylines to win.</p>
          </div>
          ${symbolsHtml}
        </div>
        <button class="sui-popup-close" id="sui-info-close">Close</button>
      </div>
    `;

    this.options.container.appendChild(popup);
    this.elements.infoPopup = popup;
    this.elements.infoContent = popup.querySelector('#sui-info-content');
    this.elements.infoClose = popup.querySelector('#sui-info-close');
  }

  createWinDisplay() {
    const winDisplay = document.createElement('div');
    winDisplay.className = 'sui-win-display';
    winDisplay.id = 'sui-win-display';
    winDisplay.innerHTML = `
      <div class="sui-win-label">You Win</div>
      <div class="sui-win-amount" id="sui-win-amount">0.00</div>
    `;

    this.options.container.appendChild(winDisplay);
    this.elements.winDisplay = winDisplay;
    this.elements.winAmountDisplay = winDisplay.querySelector('#sui-win-amount');
  }

  createFreespinsBanner() {
    const banner = document.createElement('div');
    banner.className = 'sui-freespins-banner';
    banner.id = 'sui-freespins-banner';
    banner.innerHTML = `
      <span class="sui-freespins-text">FREE SPINS: <span class="sui-freespins-count" id="sui-fs-count">0</span></span>
    `;

    this.options.container.appendChild(banner);
    this.elements.freespinsBanner = banner;
    this.elements.fsCount = banner.querySelector('#sui-fs-count');
  }

  bindEvents() {
    // Spin button
    this.elements.spinBtn.addEventListener('click', () => {
      if (!this.state.spinning) {
        this.options.onSpin();
      }
    });

    // Bet button
    this.elements.betBtn.addEventListener('click', () => {
      this.openBetPopup();
    });

    // Sound button
    this.elements.soundBtn.addEventListener('click', () => {
      this.toggleSound();
    });

    // Info button
    this.elements.infoBtn.addEventListener('click', () => {
      this.openInfoPopup();
    });

    // Bet popup close
    this.elements.betClose.addEventListener('click', () => {
      this.closeBetPopup();
    });

    // Bet popup overlay click
    this.elements.betPopup.addEventListener('click', (e) => {
      if (e.target === this.elements.betPopup) {
        this.closeBetPopup();
      }
    });

    // Bet option selection
    this.elements.betOptions.addEventListener('click', (e) => {
      const option = e.target.closest('.sui-bet-option');
      if (option) {
        const index = parseInt(option.dataset.index);
        this.selectBet(index);
      }
    });

    // Info popup close
    this.elements.infoClose.addEventListener('click', () => {
      this.closeInfoPopup();
    });

    // Info popup overlay click
    this.elements.infoPopup.addEventListener('click', (e) => {
      if (e.target === this.elements.infoPopup) {
        this.closeInfoPopup();
      }
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.state.spinning) {
        e.preventDefault();
        this.options.onSpin();
      }
      if (e.code === 'Escape') {
        this.closeBetPopup();
        this.closeInfoPopup();
      }
    });
  }

  updateDisplay() {
    this.elements.balanceEl.textContent = this.options.formatCurrency(this.state.balance);
    this.elements.winEl.textContent = this.options.formatCurrency(this.state.lastWin);
    this.elements.betEl.textContent = this.options.formatCurrency(this.state.bet);

    // Win highlight
    if (this.state.lastWin > 0) {
      this.elements.winEl.classList.add('active');
    } else {
      this.elements.winEl.classList.remove('active');
    }
  }

  setBalance(value) {
    this.state.balance = value;
    this.updateDisplay();
  }

  setBet(value) {
    this.state.bet = value;
    const index = this.options.bets.indexOf(value);
    if (index !== -1) {
      this.state.betIndex = index;
      this.updateBetSelection();
    }
    this.updateDisplay();
  }

  setWin(value) {
    this.state.lastWin = value;
    this.updateDisplay();
  }

  setSpinning(spinning) {
    this.state.spinning = spinning;
    this.elements.spinBtn.disabled = spinning;
    if (spinning) {
      this.elements.spinBtn.classList.add('spinning');
    } else {
      this.elements.spinBtn.classList.remove('spinning');
    }
  }

  selectBet(index) {
    this.state.betIndex = index;
    this.state.bet = this.options.bets[index];
    this.updateBetSelection();
    this.updateDisplay();
    this.options.onBetChange(this.state.bet, index);
  }

  updateBetSelection() {
    const options = this.elements.betOptions.querySelectorAll('.sui-bet-option');
    options.forEach((opt, i) => {
      opt.classList.toggle('selected', i === this.state.betIndex);
    });
  }

  openBetPopup() {
    this.elements.betPopup.classList.add('active');
  }

  closeBetPopup() {
    this.elements.betPopup.classList.remove('active');
  }

  openInfoPopup() {
    this.elements.infoPopup.classList.add('active');
  }

  closeInfoPopup() {
    this.elements.infoPopup.classList.remove('active');
  }

  toggleSound() {
    this.state.soundOn = !this.state.soundOn;
    this.elements.soundBtn.classList.toggle('active', this.state.soundOn);

    // Update icon
    if (this.state.soundOn) {
      this.elements.soundIcon.innerHTML = `
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      `;
    } else {
      this.elements.soundIcon.innerHTML = `
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      `;
    }

    return this.state.soundOn;
  }

  showWin(amount) {
    this.state.lastWin = amount;
    this.updateDisplay();

    if (amount > 0) {
      this.elements.winAmountDisplay.textContent = this.options.formatCurrency(amount);
      this.elements.winDisplay.classList.add('active');

      setTimeout(() => {
        this.elements.winDisplay.classList.remove('active');
      }, 2500);
    }
  }

  showFreespins(count) {
    if (count > 0) {
      this.elements.fsCount.textContent = count;
      this.elements.freespinsBanner.classList.add('active');
    } else {
      this.elements.freespinsBanner.classList.remove('active');
    }
  }

  setInfoContent(html) {
    this.elements.infoContent.innerHTML = html;
  }

  isSoundOn() {
    return this.state.soundOn;
  }

  getBet() {
    return this.state.bet;
  }

  getBalance() {
    return this.state.balance;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SlotUI;
}
