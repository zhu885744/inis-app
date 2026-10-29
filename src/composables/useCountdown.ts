import { onUnmounted, ref, type Ref } from 'vue'

/** 发验证码的倒计时（默认 60 秒，与后端发码频率限制一致） */
export function useCountdown(seconds = 60): {
  countdown: Ref<number>
  start: (value?: number) => void
  stop: () => void
} {
  const countdown = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  function stop(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    countdown.value = 0
  }

  function start(value = seconds): void {
    stop()
    countdown.value = value
    timer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) stop()
    }, 1000)
  }

  onUnmounted(stop)

  return { countdown, start, stop }
}
