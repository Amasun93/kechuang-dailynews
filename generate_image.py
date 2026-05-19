#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
from playwright.async_api import async_playwright
import markdown
import os

def convert_markdown_to_html(md_file_path):
    """将markdown文件转换为HTML"""
    with open(md_file_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # 转换markdown为HTML
    html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
    
    # 添加样式
    html_template = f"""
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=600, initial-scale=1.0">
        <title>科创升学早报</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
                width: 600px;
                margin: 0 auto;
                padding: 30px 25px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }}
            .container {{
                background: white;
                border-radius: 16px;
                padding: 30px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }}
            h1 {{
                color: #1a1a2e;
                font-size: 28px;
                margin-bottom: 20px;
                text-align: center;
                font-weight: 700;
            }}
            h2 {{
                color: #e74c3c;
                font-size: 22px;
                margin: 30px 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 3px solid #e74c3c;
            }}
            h3 {{
                color: #2c3e50;
                font-size: 18px;
                margin: 20px 0 12px 0;
            }}
            p {{
                color: #34495e;
                font-size: 15px;
                line-height: 1.8;
                margin-bottom: 12px;
            }}
            blockquote {{
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 15px 20px;
                margin: 15px 0;
                border-radius: 0 8px 8px 0;
            }}
            blockquote p {{
                color: #6c757d;
                font-size: 14px;
                margin: 0;
            }}
            hr {{
                border: none;
                border-top: 2px dashed #dee2e6;
                margin: 25px 0;
            }}
            strong {{
                color: #e74c3c;
                font-weight: 600;
            }}
            ul {{
                margin-left: 25px;
                margin-bottom: 15px;
            }}
            li {{
                color: #34495e;
                font-size: 15px;
                line-height: 1.8;
                margin-bottom: 8px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                background: white;
            }}
            th {{
                background: #667eea;
                color: white;
                padding: 12px 15px;
                text-align: left;
                font-size: 14px;
                font-weight: 600;
            }}
            td {{
                padding: 12px 15px;
                border-bottom: 1px solid #e9ecef;
                color: #34495e;
                font-size: 14px;
            }}
            tr:nth-child(even) {{
                background: #f8f9fa;
            }}
            .source-note {{
                text-align: center;
                color: #6c757d;
                font-size: 13px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            {html_content}
        </div>
    </body>
    </html>
    """
    
    return html_template

async def generate_screenshot(html_content, output_path):
    """使用playwright生成截图"""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 600, 'height': 1200})
        
        # 设置页面内容
        await page.set_content(html_content)
        
        # 等待页面完全渲染
        await page.wait_for_timeout(1000)
        
        # 获取页面实际高度
        page_height = await page.evaluate('document.body.scrollHeight')
        
        # 截图
        await page.screenshot(
            path=output_path,
            full_page=True,
            clip={'x': 0, 'y': 0, 'width': 600, 'height': page_height}
        )
        
        await browser.close()
    
    print(f"✅ 长图已生成: {output_path}")

def main():
    # 文件路径
    md_file = "20260519_交付版.md"
    output_file = "20260519_早报长图.png"
    
    # 检查markdown文件是否存在
    if not os.path.exists(md_file):
        print(f"❌ 找不到文件: {md_file}")
        return
    
    # 转换为HTML
    print("🔄 正在转换markdown为HTML...")
    html_content = convert_markdown_to_html(md_file)
    
    # 生成截图
    print("🔄 正在生成长图...")
    asyncio.run(generate_screenshot(html_content, output_file))
    
    print("🎉 完成！")

if __name__ == "__main__":
    main()
