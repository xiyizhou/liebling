import cssVars from 'css-vars-ponyfill'
import $ from 'jquery'
import lozad from 'lozad'
import Headroom from "headroom.js"
import slick from 'slick-carousel'
import tippy from 'tippy.js'
import shave from 'shave'
import AOS from 'aos'
import Fuse from 'fuse.js'
import {
  isRTL,
  formatDate,
  isDarkMode,
  isMobile,
  getParameterByName
} from './helpers'

cssVars({})

$(document).ready(() => {
  if (isRTL()) {
    $('html').attr('dir', 'rtl').addClass('rtl')
  }

  const $body = $('body')
  const $header = $('.js-header')
  const $openMenu = $('.js-open-menu')
  const $closeMenu = $('.js-close-menu')
  const $menu = $('.js-menu')
  const $toggleSubmenu = $('.js-toggle-submenu')
  const $submenuOption = $('.js-submenu-option')[0]
  const $submenu = $('.js-submenu')
  const $recentArticles = $('.js-recent-articles')
  const $openSecondaryMenu = $('.js-open-secondary-menu')
  const $openSearch = $('.js-open-search')
  const $closeSearch = $('.js-close-search')
  const $search = $('.js-search')
  const $inputSearch = $('.js-input-search')
  const $searchResults = $('.js-search-results')
  const $searchNoResults = $('.js-no-results')
  const $toggleDarkMode = $('.js-toggle-darkmode')
  const $closeNotification = $('.js-notification-close')
  const currentSavedTheme = localStorage.getItem('theme')

  let fuse = null
  let submenuIsOpen = false
  let secondaryMenuTippy = null

  function showSubmenu() {
    $header.addClass('submenu-is-active')
    $toggleSubmenu.addClass('active')
    $submenu.removeClass('closed').addClass('opened')
  }

  function hideSubmenu() {
    $header.removeClass('submenu-is-active')
    $toggleSubmenu.removeClass('active')
    $submenu.removeClass('opened').addClass('closed')
  }

  function toggleScrollVertical() {
    $body.toggleClass('no-scroll-y')
  }

  function trySearchFeature() {
    if (typeof ghostSearchApiKey !== 'undefined') {
      getAllPosts(ghostHost, ghostSearchApiKey)
    } else {
      $openSearch.css('visibility', 'hidden')
      $closeSearch.remove()
      $search.remove()
    }
  }

  function getAllPosts(host, key) {
    const api = new GhostContentAPI({
      url: host,
      key,
      version: 'v2'
    })
    const allPosts = []
    const fuseOptions = {
      shouldSort: true,
      threshold: 0,
      location: 0,
      distance: 100,
      tokenize: true,
      matchAllTokens: false,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: ['title', 'custom_excerpt', 'html']
    }

    api.posts.browse({
      limit: 'all',
      fields: 'id, title, url, published_at, custom_excerpt, html'
    })
      .then((posts) => {
        for (var i = 0, len = posts.length; i < len; i++) {
          allPosts.push(posts[i])
        }

        fuse = new Fuse(allPosts, fuseOptions)
      })
      .catch((err) => {
        console.log(err)
      })
  }

  const showNotification = (typeNotification) => {
    const $notification = $(`.js-alert[data-notification="${typeNotification}"]`)
    $notification.addClass('opened')
    setTimeout(() => {
      closeNotification($notification)
    }, 5000)
  }

  const closeNotification = ($notification) => {
    $notification.removeClass('opened')
    const url = window.location.toString()

    if (url.indexOf('?') > 0) {
      const cleanUrl = url.substring(0, url.indexOf('?'))
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }

  const checkForActionParameter = () => {
    const action = getParameterByName('action')
    const stripe = getParameterByName('stripe')

    if (action === 'subscribe') {
      showNotification('subscribe')
    }

    if (action === 'signup') {
      window.location = `${ghostHost}/signup/?action=checkout`
    }

    if (action === 'checkout') {
      showNotification('signup')
    }

    if (action === 'signin') {
      showNotification('signin')
    }

    if (stripe === 'success') {
      showNotification('checkout')
    }
  }

  $openMenu.click(() => {
    $header.addClass('mobile-menu-opened')
    $menu.addClass('opened')
    toggleScrollVertical()
  })

  $closeMenu.click(() => {
    $header.removeClass('mobile-menu-opened')
    $menu.removeClass('opened')
    toggleScrollVertical()
  })

  $toggleSubmenu.click(() => {
    submenuIsOpen = !submenuIsOpen

    if (submenuIsOpen) {
      showSubmenu()
    } else {
      hideSubmenu()
    }
  })

  $openSearch.click(() => {
    $search.addClass('opened')
    setTimeout(() => {
      $inputSearch.focus()
    }, 400);
    toggleScrollVertical()
  })

  $closeSearch.click(() => {
    $inputSearch.blur()
    $search.removeClass('opened')
    toggleScrollVertical()
  })

  $inputSearch.keyup(() => {
    if ($inputSearch.val().length > 0 && fuse) {
      const results = fuse.search($inputSearch.val())
      let htmlString = ''

      if (results.length > 0) {
        for (var i = 0, len = results.length; i < len; i++) {
          htmlString += `
          <article class="m-result">\
            <a href="${results[i].url}" class="m-result__link">\
              <h3 class="m-result__title">${results[i].title}</h3>\
              <span class="m-result__date">${formatDate(results[i].published_at)}</span>\
            </a>\
          </article>`
        }

        $searchNoResults.hide()
        $searchResults.html(htmlString)
        $searchResults.show()
      } else {
        $searchResults.html('')
        $searchResults.hide()
        $searchNoResults.show()
      }
    } else {
      $searchResults.html('')
      $searchResults.hide()
      $searchNoResults.hide()
    }
  })

  $toggleDarkMode.change(() => {
    if ($toggleDarkMode.is(':checked')) {
      $('html').attr('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    } else {
      $('html').attr('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    }
  })

  $closeNotification.click(function () {
    closeNotification($(this).parent())
  })

  $(window).click((e) => {
    if (submenuIsOpen) {
      if ($submenuOption && !$submenuOption.contains(e.target)) {
        submenuIsOpen = false
        hideSubmenu()
      }
    }
  })

  if (currentSavedTheme) {
    $('html').attr('data-theme', currentSavedTheme)

    if (currentSavedTheme === 'dark') {
      $toggleDarkMode.attr('checked', true)
    }
  } else {
    if (isDarkMode()) {
      $toggleDarkMode.attr('checked', true)
    }
  }

  if ($header.length > 0) {
    const headroom = new Headroom($header[0], {
      tolerance: {
        down: 10,
        up: 20
      },
      offset: 15,
      onUnpin: () => {
        if (!isMobile() && secondaryMenuTippy) {
          const desktopSecondaryMenuTippy = secondaryMenuTippy[0]

          if (
            desktopSecondaryMenuTippy && desktopSecondaryMenuTippy.state.isVisible
          ) {
            desktopSecondaryMenuTippy.hide()
          }
        }
      }
    })
    headroom.init()
  }

  if ($recentArticles.length > 0) {
    $recentArticles.on('init', function () {
      shave('.js-recent-article-title', 50)
    })

    $recentArticles.slick({
      adaptiveHeight: true,
      arrows: false,
      infinite: false,
      mobileFirst: true,
      variableWidth: true,
      rtl: isRTL()
    })
  }

  if (typeof disableFadeAnimation === 'undefined' || !disableFadeAnimation) {
    AOS.init({
      once: true,
      startEvent: 'DOMContentLoaded',
    })
  } else {
    $('[data-aos]').addClass('no-aos-animation')
  }

  const observer = lozad('.lozad', {
    loaded: (el) => {
      el.classList.add('loaded')
    }
  })
  observer.observe()

  if ($openSecondaryMenu.length > 0) {
    const template = document.getElementById('secondary-navigation-template')

    secondaryMenuTippy = tippy('.js-open-secondary-menu', {
      content: template.innerHTML,
      arrow: true,
      trigger: 'click',
      interactive: true
    })
  }

  tippy('.js-tooltip')

  shave('.js-article-card-title', 100)
  shave('.js-article-card-title-no-image', 250)

  checkForActionParameter()
  trySearchFeature()
})
