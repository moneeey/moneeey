#!/bin/bash

yarn test-cr --reporter=null

function slowdown() {
  local NAME=$1
  local VID_PATH=$2
  local OUT_VID="../${NAME}.webm"
  rm -f "${OUT_VID}"
  ffmpeg -i "${VID_PATH}" -filter:v "setpts=5.0*PTS" -af "atempo=0.5" -c:v libvpx-vp9 -b:v 2M -c:a libopus "${OUT_VID}"

}

slowdown "Tour" "test-results/tour-Moneeey-Tour-chromium/video.webm"
slowdown "Import" "test-results/tour-Moneeey-Import-chromium/video.webm"

