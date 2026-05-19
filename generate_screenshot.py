#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将markdown格式的科创升学早报转换为竖版长图
使用Python + playwright实现
"""

import markdown
import os
from datetime import datetime

def generate_html(md_content):
    """将markdown转换为带样式的HTML"""
    
    # 自定义CSS样式 - 手机阅读优化
    css = """
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
            background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%);
            color: #333;
            line-height: 1.8;
            padding: 20px;
            width: 600px;
        }
        
        h1 {
            font-size: 28px;
            color: #1a56db;
            text-align: center;
            padding: 25px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 16px;
            margin-bottom: 20px;
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.3);
            letter-spacing: 2px;
        }
        
        blockquote {
            background: linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%);
            border-left: 5px solid #6366f1;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 8px;
            font-size: 14px;
            color: #4b5563;
        }
        
        h2 {
            font-size: 22px;
            color: #1e40af;
            margin: 30px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 3px solid #e0e7ff;
            position: relative;
        }
        
        h2::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            width: 80px;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 2px;
        }
        
        h3 {
            font-size: 18px;
            color: #3730a3;
            margin: 25px 0 15px 0;
            background: linear-gradient(90deg, #f0f9ff, transparent);
            padding: 10px 15px;
            border-left: 4px solid #0ea5e9;
            border-radius: 0 8px 8px 0;
        }
        
        p {
            font-size: 16px;
            margin: 12px 0;
            color: #374151;
            text-align: justify;
        }
        
        strong {
            color: #dc2626;
            font-weight: 600;
        }
        
        hr {
            border: none;
            height: 2px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 25px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #f3f4f6;
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        tr:hover td {
            background: #f8fafc;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 8px 0;
            font-size: 15px;
            color: #4b5563;
        }
        
        .emoji-icon {
            font-size: 20px;
            margin-right: 8px;
        }
        
        .highlight-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 12px;
            padding: 15px 20px;
            margin: 20px 0;
            border: 2px solid #f59e0b;
        }
        
        .interpretation {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-radius: 10px;
            padding: 12px 18px;
            margin-top: 15px;
            border-left: 4px solid #10b981;
        }
        
        .interpretation p {
            font-size: 15px;
            color: #065f46;
            margin: 0;
        }
        
        .footer {
            text-align: center;
            padding: 30px 20px;
            margin-top: 40px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            color: #6b7280;
            font-size: 14px;
        }
        
        .location-tag {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            margin-right: 10px;
        }
    </style>
    """
    
    # 转换markdown
    md = markdown.Markdown(extensions=['tables', 'fenced_code'])
    html_content = md.convert(md_content)
    
    # 构建完整HTML
    full_html = f"""
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=600, initial-scale=1.0">
        <title>科创升学早报 - {datetime.now().strftime('%Y年%m月%d日')}</title>
        {css}
    </head>
    <body>
        {html_content}
        <div class="footer">
            <p>📡 科创升学早报</p>
            <p>每日精选 · 权威信源 · 家长必读</p>
            <p style="margin-top: 10px; font-size: 12px;">{datetime.now().strftime('%Y年%m月%d日')}</p>
        </div>
    </body>
    </html>
    """
    
    return full_html

def take_screenshot(html_file, output_file):
    """使用playwright截取长图"""
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 600, 'height': 800})
        
        # 读取HTML文件
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        page.set_content(html_content)
        
        # 等待页面完全渲染
        page.wait_for_timeout(1000)
        
        # 获取页面实际高度
        page_height = page.evaluate('document.body.scrollHeight')
        
        # 设置视口高度为页面实际高度
        page.set_viewport_size({'width': 600, 'height': page_height})
        
        # 截图
        page.screenshot(path=output_file, full_page=True)
        
        browser.close()
    
    print(f"✅ 截图已保存: {output_file}")
    print(f"📐 图片尺寸: 600px × {page_height}px")

def main():
    # 读取markdown文件
    md_file = './科创升学早报/20260518_交付版.md'
    html_file = './科创升学早报/temp_render.html'
    output_file = './科创升学早报/20260518_早报长图.png'
    
    print("🚀 开始生成早报长图...")
    
    # 读取markdown内容
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # 生成HTML
    print("📝 正在渲染HTML...")
    html_content = generate_html(md_content)
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    # 生成截图
    print("🖼️ 正在生成长图...")
    take_screenshot(html_file, output_file)
    
    # 清理临时文件
    if os.path.exists(html_file):
        os.remove(html_file)
    
    print("\n🎉 早报长图生成完成!")
    print(f"📍 文件位置: {output_file}")

if __name__ == '__main__':
    main()
