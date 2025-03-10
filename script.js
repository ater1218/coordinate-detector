document.getElementById('imageUpload').addEventListener('change', handleImageUpload);

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            processImage(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage(img) {
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const mode = document.getElementById('mode').value;
    let results;
    if (mode === 'icon') {
        results = detectIcons(ctx);
    } else {
        results = analyzeYCoordinates(ctx);
    }

    displayResults(results);
    visualizeResults(ctx, results, mode);
}

function detectIcons(ctx) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const results = [];
    const minWidth = 30, maxWidth = 31, minHeight = 35, maxHeight = 40;

    // 赤色検出（簡易的なHSV代替）
    for (let y = 0; y < ctx.canvas.height; y++) {
        for (let x = 0; x < ctx.canvas.width; x++) {
            const index = (y * ctx.canvas.width + x) * 4;
            const r = data[index], g = data[index + 1], b = data[index + 2];
            if ((r > 150 && g < 100 && b < 100) || (r > 120 && g < 120 && b < 120)) {
                // 領域のサイズを簡易的に確認
                let w = 1, h = 1;
                for (let dx = 1; dx <= maxWidth && x + dx < ctx.canvas.width; dx++) {
                    const nextIndex = (y * ctx.canvas.width + (x + dx)) * 4;
                    if (data[nextIndex] < 150) break;
                    w = dx + 1;
                }
                for (let dy = 1; dy <= maxHeight && y + dy < ctx.canvas.height; dy++) {
                    const nextIndex = ((y + dy) * ctx.canvas.width + x) * 4;
                    if (data[nextIndex] < 150) break;
                    h = dy + 1;
                }
                if (minWidth <= w && w <= maxWidth && minHeight <= h && h <= maxHeight) {
                    results.push({ x: x + w / 2, y: y, width: w, height: h });
                    x += w; // 重複を避ける
                }
            }
        }
    }
    return results;
}

function analyzeYCoordinates(ctx) {
    const results = {};
    const xRanges = {
        '1P': { start: 215, end: 222 },
        '2P': { start: 431, end: 438 },
        '3P': { start: 648, end: 655 },
        '4P': { start: 864, end: 871 }
    };
    const targetYCoords = [1379, 1381, 1382, 1384, /* 省略 */ 1529]; // 完全なリストは元のコードから移植

    for (const [player, range] of Object.entries(xRanges)) {
        let found = false;
        for (let y = 1370; y < 1550 && !found; y++) {
            let whiteCount = 0;
            for (let x = range.start; x <= range.end; x++) {
                const index = (y * ctx.canvas.width + x) * 4;
                const r = ctx.getImageData(x, y, 1, 1).data[0];
                if (r > 200) whiteCount++;
            }
            if (whiteCount >= 4) {
                const nearestY = targetYCoords.reduce((prev, curr) => 
                    Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev
                );
                results[player] = { y: y, targetY: nearestY, index: targetYCoords.indexOf(nearestY) + 1 };
                found = true;
            }
        }
        if (!found) results[player] = null;
    }
    return results;
}

function displayResults(results) {
    const resultText = document.getElementById('resultText');
    resultText.textContent = '';
    if (document.getElementById('mode').value === 'icon') {
        if (results.length) {
            results.forEach((r, i) => {
                resultText.textContent += `検出 ${i + 1}:\n  座標: (${r.x.toFixed(1)}, ${r.y})\n  サイズ: ${r.width}x${r.height}\n`;
            });
        } else {
            resultText.textContent = '指定されたサイズ範囲のアイコンが検出されませんでした\n';
        }
    } else {
        resultText.textContent = 'Y座標分析結果:\n\n';
        for (const [player, result] of Object.entries(results)) {
            if (result) {
                resultText.textContent += `${player}: ${result.index}${result.y !== result.targetY ? ` (元のy座標: ${result.y})` : ''}\n`;
            } else {
                resultText.textContent += `${player}: 条件を満たす結果が見つかりませんでした\n`;
            }
        }
    }
}

function visualizeResults(ctx, results, mode) {
    if (mode === 'icon') {
        results.forEach(r => {
            ctx.strokeStyle = 'green';
            ctx.strokeRect(r.x - r.width / 2, r.y, r.width, r.height);
            ctx.beginPath();
            ctx.arc(r.x, r.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
        });
    } else {
        for (const [_, result] of Object.entries(results)) {
            if (result) {
                ctx.beginPath();
                ctx.moveTo(0, result.y);
                ctx.lineTo(ctx.canvas.width, result.y);
                ctx.strokeStyle = 'green';
                ctx.stroke();
            }
        }
    }
}
