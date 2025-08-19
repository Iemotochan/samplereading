class MangaViewer {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 0;
        this.zoomLevel = 1;
        this.images = [];
        this.pageContainer = document.getElementById('page-container');
        this.pageInfo = document.getElementById('page-info');
        this.viewer = document.getElementById('manga-viewer');
        this.hasShownCTA = false;
        
        this.init();
    }

    async init() {
        this.showLoadingScreen();
        await this.loadImages();
        this.setupControls();
        this.setupKeyboardControls();
        this.setupScrollDetection();
        this.setupCTAModal();
        this.displayPage();
        this.hideLoadingScreen();
    }

    async loadImages() {
        // 001.png から連番で画像を探す
        let pageNumber = 1;
        let consecutiveFailures = 0;
        
        while (consecutiveFailures < 3) { // 3回連続で失敗したら終了
            const imagePath = `image/${String(pageNumber).padStart(3, '0')}.png`;
            
            try {
                const exists = await this.checkImageExists(imagePath);
                if (exists) {
                    this.images.push(imagePath);
                    consecutiveFailures = 0;
                } else {
                    consecutiveFailures++;
                }
            } catch (error) {
                consecutiveFailures++;
            }
            
            pageNumber++;
        }
        
        this.totalPages = this.images.length;
        
        if (this.totalPages === 0) {
            this.showNoImagesMessage();
        }
    }

    checkImageExists(imagePath) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = imagePath;
        });
    }

    showNoImagesMessage() {
        this.pageContainer.innerHTML = `
            <div style="color: #fff; text-align: center; padding: 50px;">
                <h2>画像が見つかりません</h2>
                <p>imageフォルダに001.png、002.png...の形式で画像を配置してください。</p>
            </div>
        `;
    }

    displayPage() {
        if (this.totalPages === 0) return;
        
        // 初回のみ全ページを表示
        if (this.pageContainer.children.length === 0) {
            this.loadAllPages();
        } else {
            this.highlightCurrentPage();
            this.scrollToCurrentPage();
        }
        
        this.updatePageInfo();
    }

    loadAllPages() {
        this.pageContainer.innerHTML = '';
        
        for (let i = 1; i <= this.totalPages; i++) {
            const img = document.createElement('img');
            img.src = this.images[i - 1];
            img.className = 'manga-page';
            img.alt = `ページ ${i}`;
            img.style.transform = `scale(${this.zoomLevel})`;
            img.dataset.pageNumber = i;
            
            this.pageContainer.appendChild(img);
        }
        
        this.highlightCurrentPage();
    }

    highlightCurrentPage() {
        // 全ページのハイライトをリセット
        const allImages = this.pageContainer.querySelectorAll('.manga-page');
        allImages.forEach(img => {
            img.style.border = '';
            img.style.boxShadow = '';
        });
        
        // 現在のページをハイライト
        const currentImg = this.pageContainer.querySelector(`[data-page-number="${this.currentPage}"]`);
        if (currentImg) {
            currentImg.style.border = '2px solid #fff';
            currentImg.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.5)';
        }
    }

    scrollToCurrentPage() {
        const currentImg = this.pageContainer.querySelector(`[data-page-number="${this.currentPage}"]`);
        if (currentImg) {
            currentImg.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    updatePageInfo() {
        this.pageInfo.textContent = `${this.currentPage} / ${this.totalPages}`;
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.displayPage();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayPage();
        }
    }

    zoomIn() {
        this.zoomLevel = Math.min(3, this.zoomLevel + 0.2);
        this.updateZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.2);
        this.updateZoom();
    }

    fitToWidth() {
        this.zoomLevel = 1;
        this.updateZoom();
    }

    updateZoom() {
        const images = this.pageContainer.querySelectorAll('.manga-page');
        images.forEach(img => {
            img.style.transform = `scale(${this.zoomLevel})`;
        });
    }

    setupControls() {
        document.getElementById('prev-btn').addEventListener('click', () => this.prevPage());
        document.getElementById('next-btn').addEventListener('click', () => this.nextPage());
        document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('fit-width').addEventListener('click', () => this.fitToWidth());
        
        // タッチジェスチャー対応
        let startY = 0;
        let startX = 0;
        
        this.viewer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startX = e.touches[0].clientX;
        });
        
        this.viewer.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const endX = e.changedTouches[0].clientX;
            const diffY = startY - endY;
            const diffX = startX - endX;
            
            // 横スワイプでページ移動
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    this.nextPage();
                } else {
                    this.prevPage();
                }
            }
        });
    }

    setupScrollDetection() {
        let scrollTimeout;
        
        this.viewer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.updateCurrentPageFromScroll();
                this.checkIfReachedEnd();
            }, 100);
        });
    }

    updateCurrentPageFromScroll() {
        const viewerRect = this.viewer.getBoundingClientRect();
        const viewerCenter = viewerRect.top + viewerRect.height / 2;
        
        const images = this.pageContainer.querySelectorAll('.manga-page');
        let closestPage = 1;
        let closestDistance = Infinity;
        
        images.forEach((img, index) => {
            const imgRect = img.getBoundingClientRect();
            const imgCenter = imgRect.top + imgRect.height / 2;
            const distance = Math.abs(imgCenter - viewerCenter);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPage = index + 1;
            }
        });
        
        if (closestPage !== this.currentPage) {
            this.currentPage = closestPage;
            this.highlightCurrentPage();
            this.updatePageInfo();
        }
    }

    checkIfReachedEnd() {
        // 最後まで読了した場合の検出
        if (!this.hasShownCTA && this.currentPage === this.totalPages) {
            const lastImage = this.pageContainer.querySelector(`[data-page-number="${this.totalPages}"]`);
            if (lastImage) {
                const rect = lastImage.getBoundingClientRect();
                const viewerRect = this.viewer.getBoundingClientRect();
                
                // 最後の画像の下部が画面内に入った場合
                if (rect.bottom <= viewerRect.bottom + 100) {
                    this.hasShownCTA = true;
                    setTimeout(() => {
                        this.showCTAModal();
                    }, 1000); // 1秒後に表示
                }
            }
        }
    }

    setupCTAModal() {
        const modal = document.getElementById('cta-modal');
        const closeBtn = document.getElementById('close-modal');
        const restartBtn = document.getElementById('restart-reading');
        const ctaButtons = document.querySelectorAll('.cta-btn');

        // 閉じるボタン
        closeBtn.addEventListener('click', () => {
            this.hideCTAModal();
        });

        // もう一度読むボタン
        restartBtn.addEventListener('click', () => {
            this.hideCTAModal();
            this.restartReading();
        });

        // CTAボタンのクリックイベント
        ctaButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const platform = btn.dataset.platform;
                this.trackCTAClick(platform);
                
                // 実際のリンクに変更可能
                const urls = {
                    mechacomic: 'https://mechacomic.jp/',
                    piccoma: 'https://piccoma.com/',
                    kindle: 'https://amazon.co.jp/kindle',
                    bookstore: 'https://japan-revival.com'
                };
                
                if (urls[platform]) {
                    window.open(urls[platform], '_blank');
                }
            });
        });

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideCTAModal();
            }
        });

        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideCTAModal();
            }
        });
    }

    showCTAModal() {
        const modal = document.getElementById('cta-modal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // スクロールを無効化
    }

    hideCTAModal() {
        const modal = document.getElementById('cta-modal');
        modal.style.display = 'none';
        document.body.style.overflow = ''; // スクロールを有効化
    }

    restartReading() {
        this.currentPage = 1;
        this.hasShownCTA = false;
        this.displayPage();
    }

    trackCTAClick(platform) {
        // アナリティクス等でのトラッキング用
        console.log(`CTA clicked: ${platform}`);
        
        // Google Analytics等があれば以下のようにトラッキング
        // gtag('event', 'cta_click', {
        //     'platform': platform,
        //     'manga_title': 'manga_name'
        // });
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.display = 'flex';
        
        // ローディングテキストを動的に変更
        const loadingTexts = [
            'ページをスキャンしています',
            '画像を読み込んでいます',
            '冒険の準備をしています',
            'もうすぐ完了です...'
        ];
        
        let textIndex = 0;
        const loadingTextEl = loadingScreen.querySelector('.loading-text');
        
        this.loadingTextInterval = setInterval(() => {
            loadingTextEl.textContent = loadingTexts[textIndex];
            textIndex = (textIndex + 1) % loadingTexts.length;
        }, 800);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        
        if (this.loadingTextInterval) {
            clearInterval(this.loadingTextInterval);
        }
        
        loadingScreen.classList.add('fade-out');
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.remove('fade-out');
        }, 800);
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.prevPage();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.fitToWidth();
                    break;
            }
        });
    }
}

// ページ読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    new MangaViewer();
});

// 右クリックを禁止
document.addEventListener('contextmenu', e => e.preventDefault());