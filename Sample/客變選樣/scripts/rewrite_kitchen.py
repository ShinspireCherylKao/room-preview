"""
完全重寫廚房 tab 結構：深色主題 + 下拉選單，與參考站對齊
"""
from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "room" / "preview02.html"
content = HTML.read_text(encoding="utf-8")

NEW_KITCHEN = '''<div class="tab-panel" id="tab-kitchen">

        <h2 class="kit-section-title">職人訂製</h2>

        <div class="panel-grid">

            <!-- 左：選材（select 下拉） -->
            <div class="select-col">
                <h3 class="kit-intro">請選擇廚房 / 客餐廳風格及面板</h3>

                <div class="kit-selects">
                    <div class="kit-select-row">
                        <label for="kitAppliance">電器櫃</label>
                        <select id="kitAppliance" class="kit-switch" data-zone="appliance-cab" data-view="near">
                            <option value="tropical-walnut" data-color="#6b4c3b" selected>熱帶核桃木</option>
                            <option value="oak-white" data-color="#d4c5a9">白橡木</option>
                            <option value="gray-oak" data-color="#9e9589">灰橡木</option>
                        </select>
                    </div>
                    <div class="kit-select-row">
                        <label for="kitCountertop">廚具檯面</label>
                        <select id="kitCountertop" class="kit-switch" data-zone="countertop" data-view="near">
                            <option value="gray-pheasant" data-color="#8a8078" selected>灰點帝雉石</option>
                            <option value="snow-white" data-color="#e8e0d6">雪白石</option>
                        </select>
                    </div>
                    <div class="kit-select-row">
                        <label for="kitUpper">上櫃面板</label>
                        <select id="kitUpper" class="kit-switch" data-zone="upper-cab" data-view="near">
                            <option value="tropical-walnut" data-color="#6b4c3b" selected>熱帶核桃木</option>
                            <option value="oak-white" data-color="#d4c5a9">白橡木</option>
                            <option value="gray-oak" data-color="#9e9589">灰橡木</option>
                        </select>
                    </div>
                    <div class="kit-select-row">
                        <label for="kitLower">下櫃面板</label>
                        <select id="kitLower" class="kit-switch" data-zone="lower-cab" data-view="near">
                            <option value="tropical-walnut" data-color="#6b4c3b" selected>熱帶核桃木</option>
                            <option value="oak-white" data-color="#d4c5a9">白橡木</option>
                            <option value="gray-oak" data-color="#9e9589">灰橡木</option>
                        </select>
                    </div>
                    <div class="kit-select-row">
                        <label for="kitWall">客廳油漆</label>
                        <select id="kitWall" class="kit-switch" data-zone="wall" data-view="near">
                            <option value="white" data-color="#ffffff" selected>白色</option>
                            <option value="fog-country" data-color="#d5cfc5">霧鄉</option>
                        </select>
                    </div>
                    <div class="kit-select-row">
                        <label for="kitFloor">地坪</label>
                        <select id="kitFloor" class="kit-switch" data-zone="floor" data-view="far">
                            <option value="gray-oak" data-color="#9e9590">灰橡木</option>
                            <option value="white-pine" data-color="#d6cfc5" selected>白松木</option>
                            <option value="cream-maple" data-color="#ddd5c4">米楓木</option>
                        </select>
                    </div>
                    <div class="kit-select-row">
                        <label for="kitDoor">門片顏色</label>
                        <select id="kitDoor" class="kit-switch" data-zone="door" data-view="far">
                            <option value="walnut" data-color="#5c3d2e">胡桃木</option>
                            <option value="star-oak" data-color="#8b7355" selected>星際橡木</option>
                            <option value="eucalyptus" data-color="#c4b896">淺尤加利</option>
                        </select>
                    </div>
                </div>

                <div class="house-note">
                    <ol>
                        <li>建材色票僅為示意，實際以現場選材室為主</li>
                        <li>3D僅為空間示意</li>
                    </ol>
                    <div class="note-banner">實際建材款式依現場選材室為主</div>
                </div>
            </div>

            <!-- 右：照片預覽 -->
            <div class="viewer-col">
                <div class="viewer" id="viewer-kitchen">
                    <!-- 近景：廚房 -->
                    <svg class="photo-view active" id="view-near"
                         viewBox="0 0 822 732" preserveAspectRatio="xMidYMid slice">
                        <image href="../image/原圖/廚房.jpg" width="822" height="732"/>
                    </svg>

                    <!-- 近景 zone overlays（預合成 RGBA PNG） -->
                    <div class="zone-overlays zone-overlays-near">
                        <div class="zone-layer" data-overlay-zone="appliance-cab"></div>
                        <div class="zone-layer" data-overlay-zone="wall"></div>
                        <div class="zone-layer" data-overlay-zone="countertop"></div>
                        <div class="zone-layer" data-overlay-zone="upper-cab"></div>
                        <div class="zone-layer" data-overlay-zone="lower-cab"></div>
                    </div>

                    <!-- 遠景：客餐廳 -->
                    <svg class="photo-view" id="view-far"
                         viewBox="0 0 998 812" preserveAspectRatio="xMidYMid slice">
                        <image href="../image/原圖/客餐廳.jpg" width="998" height="812"/>
                    </svg>

                    <!-- 遠景 zone overlays -->
                    <div class="zone-overlays zone-overlays-far">
                        <div class="zone-layer" data-overlay-zone="floor"></div>
                    </div>

                    <div class="alert-notes">此為網站測試樣版，實際以買賣合約書為準</div>

                    <!-- 近景/遠景指示 -->
                    <div class="view-indicator">
                        <button class="view-indicator__btn active" data-view="near">
                            <i class="fa-solid fa-magnifying-glass-plus"></i> 近景
                        </button>
                        <button class="view-indicator__btn" data-view="far">
                            <i class="fa-solid fa-magnifying-glass-minus"></i> 遠景
                        </button>
                    </div>
                </div>
            </div>

        </div><!-- /.panel-grid -->
    </div><!-- /#tab-kitchen -->'''

# Replace kitchen tab
start = '<div class="tab-panel" id="tab-kitchen">'
end = '</div><!-- /#tab-kitchen -->'
si = content.find(start)
ei = content.find(end) + len(end)
print(f"Old kitchen length: {ei - si}")

new_content = content[:si] + NEW_KITCHEN + content[ei:]
HTML.write_text(new_content, encoding="utf-8")
print(f"New kitchen length: {len(NEW_KITCHEN)}")
print("Done.")
