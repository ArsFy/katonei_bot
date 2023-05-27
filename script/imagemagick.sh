#!/bin/bash
apt-get update
apt-get install -y build-essential git libjpeg-dev libpng-dev libtiff-dev libgif-dev libx11-dev libxext-dev libfontconfig1-dev libfreetype6-dev libxml2-dev libcairo2-dev libwebp-dev libopenjp2-7-dev
git clone https://github.com/ImageMagick/ImageMagick.git
cd ImageMagick
git checkout 7.1.1
./configure
make
make install
cd ..
rm -rf ImageMagick