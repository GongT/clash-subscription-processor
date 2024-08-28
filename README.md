# clash 配置文件处理器

## 功能

* 大部分机场给的是完整配置文件，只取其中的代理服务器部分
* 根据名称删掉服务器中一些已知不能用的（或者特定地区的）
* 合并多个订阅，导出成一个

## 使用说明
1. 安装依赖: `pnpm install`
2. 编译: `./node_modules/.bin/tsc -p src`
3. 参考`config.example.yaml`，复制一个改名为`config.yaml`，修改好设置
4. 运行
   1. 作为systemd服务（自启动）: `sudo bash scripts/install.sh` 服务名为 `clash-subscription-processor.service`
   2. 直接运行: `node lib/main.js`
