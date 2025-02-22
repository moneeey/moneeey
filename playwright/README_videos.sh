#!/bin/bash

yarn test-cr --reporter=null

function slowdown() {
  local NAME=$1
  local VID_PATH=$2
  local OUT_VID="../${NAME}.webm"
  rm -f "${OUT_VID}"
  ffmpeg -i "${VID_PATH}" -vf "setpts=2.0*PTS" -an "${OUT_VID}"
}

slowdown "Tour" "test-results/tour-Moneeey-Tour-chromium/video.webm"
slowdown "Import" "test-results/tour-Moneeey-Import-chromium/video.webm"

