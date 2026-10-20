<template>
  <section class="reading">
    <div class="eyebrow">ABOUT</div>
    <h1>知道命令，就能开始。</h1>
    <p>
      cmdhelper 帮助你理解参数，逐步生成可用的命令。网页与 CLI
      共用同一份结构化命令资料。
    </p>
    <h2>终端中使用</h2>
    <pre>
npx cmdhelper ssh
cmdhelper scp
cmdhelper search 端口
cmdhelper explain ssh</pre>
    <p>CLI 尚未发布到 npm；当前在项目根目录运行 <code>pnpm cli ssh</code>。</p>
    <h2>内容与边界</h2>
    <p>
      支持 SSH、SCP、Git 与 curl
      的常用场景和参数。内容并非完整手册；可在右侧访问官方资料。命令输入保留在当前页面内存中。
    </p>
    <a href="https://github.com/oft/cmdhelper">GitHub · oft/cmdhelper ↗</a>
  </section>
</template>
