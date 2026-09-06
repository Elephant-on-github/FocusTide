import { reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSettings } from '~~/stores/settings'
import { useSchedule } from '~~/stores/schedule'
import { useNotifications } from '~~/stores/notifications'
import { EventType, useEvents } from '~~/stores/events'

interface SoundSettings {
  source: HTMLAudioElement,
  ready: boolean
}

export function useDesktop () {
  const settingsStore = useSettings()
  const scheduleStore = useSchedule()
  const notificationsStore = useNotifications()
  const eventsStore = useEvents()
  const i18n = useI18n()

  const state = reactive({
    currentSoundSet: null as string | null,
    sounds: {
      work: null as SoundSettings | null,
      shortpause: null as SoundSettings | null,
      longpause: null as SoundSettings | null
    }
  })

  const lastEvent = computed(() => {
    const lastEventArray = eventsStore.events.slice(-1)
    return lastEventArray.length > 0 ? lastEventArray[0] : null
  })

  watch(lastEvent, (newValue) => {
    if (newValue !== null && newValue._event === EventType.TIMER_FINISH) {
      showNotification(scheduleStore.getSchedule[1].type)
    }
  })

  watch(() => settingsStore.audio.soundSet, (newSoundSet) => {
    loadSoundSet(newSoundSet)
  })

  eventsStore.$subscribe(() => {
    if (eventsStore.lastEvent !== null && eventsStore.lastEvent._event === EventType.NOTIFICATIONS_ENABLED && window.Notification && window.Notification.permission === 'default') {
      window.Notification.requestPermission().then((newNotificationPermission) => {
        settingsStore.$patch({
          permissions: {
            notifications: newNotificationPermission === 'granted'
          }
        })
      })
    }
  })

  onMounted(() => {
    eventsStore.recordEvent(EventType.APP_STARTED)

    loadSoundSet(settingsStore.audio.soundSet)

    if (window && window.document && 'hidden' in window.document) {
      window.document.addEventListener('visibilitychange', () => {
        settingsStore.registerNewHidden(window.document.hidden)
      }, false)

      settingsStore.registerNewHidden(window.document.hidden)
    } else {
      settingsStore.registerNewHidden(false)
    }

    notificationsStore.updateEnabled()
  })

  const loadSoundSet = (setName = settingsStore.audio.soundSet) => {
    if (state.currentSoundSet === setName) { return }

    try {
      for (const key in state.sounds) {
        const soundKey = key as keyof typeof state.sounds
        const newSound = {
          source: new Audio(`/audio/${setName}/${key}.mp3`),
          ready: false
        }

        newSound.source.addEventListener('canplay', () => {
          newSound.ready = true
        })

        state.sounds[soundKey] = newSound
      }

      state.currentSoundSet = setName
    } catch (err) {
      console.warn(err)
    }
  }

  const playSound = (key: keyof typeof state.sounds) => {
    if (!state.currentSoundSet) {
      loadSoundSet(settingsStore.audio.soundSet)
    }

    if (state.sounds[key] !== null && settingsStore.permissions.audio) {
      state.sounds[key]!.source.volume = settingsStore.audio.volume
      state.sounds[key]?.source.play()
    }
  }

  const showNotification = (nextState: keyof typeof state.sounds) => {
    playSound(nextState)

    if (window.Notification.permission !== 'granted' || settingsStore.permissions.notifications !== true) { return }
    const notificationActions : NotificationAction[] = []
    if (nextState === 'work') {
      notificationActions.push({
        action: 'ready',
        title: i18n.t('notification.action.ready')
      })
    }

    try {
      new Notification(i18n.t('notification.' + nextState + '.title'), {
        tag: 'FocusTide-SectionNotify',
        body: i18n.t('notification.' + nextState + '.body'),
        actions: notificationActions
      })
    } catch (err) {
      console.warn(err)
    }
  }
}
