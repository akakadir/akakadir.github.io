---
layout: post
title: "detaylıca: FFmpeg rehberi"
categories: [yazılım, genel]
tags: [programlar, araçlar]
comment_issue_id: 17
---

Hoşgeldin, bugün sana multimedya dünyasının isviçre çakısı lakabı ile bilinen FFmpeg'den bahsedeceğim. Bu küçük ama güçlü araç, video ve ses dosyalarıyla yapamayacağın neredeyse hiçbir şey bırakmıyor.

FFmpeg, herhangi bir video formatını başka bir video formatına kodeklerini de değiştirerek çevirebilen açık kaynak kodlu ücretsiz bir yazılımdır. FFmpeg, neredeyse tüm  [ses/görüntü kodeklerini](https://www.ffmpeg.org/ffmpeg-codecs.html)(h264, h265, vp8, vp9, aac, opus, etc.), [dosya formatlarını](https://www.ffmpeg.org/ffmpeg-formats.html)(mp4, flv, mkv, ts, webm, mp3 etc.) hatta tüm [streaming protokollerini](https://www.ffmpeg.org/ffmpeg-protocols.html)(http, rtmp, rtsp, hls, etc.) destekler.

Yukarıda FFmpeg‘in bir yazılım olduğundan bahsettim, aslında FFmpeg aynı zamanda bir kütüphanedir. Yani şunu demek istiyorum. FFmpeg’i kendi başına bir yazılım olarak kullanabileceğin gibi FFmpeg’i kendi projenin içine ekleyebilir ve geliştirdiğin medya projesinde kütüphane olarak da kullanabilirsin.

Bu proje o kadar kapsamlı ki, hemen hemen hepimizin duyduğu, kullandığı(VLC, YouTube, MPlayer, etc.) [projeler](https://trac.ffmpeg.org/wiki/Projects) bir şekilde FFmpeg’i kullanıyor.

Beraber kuruluma başlayalım. Öncelikle [buradan](https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.7z) Windows Essentinal build'ini indir, ardından indirilen .zip dosyasını çıkart(örneğin `C:\ffmpeg` klasörüne). Bundan sonrası biraz farklı ilerleyecek. FFmpeg'in cmd üzerinde çalışabilmesi için sistem PATH'ine(yoluna) eklenmesi gerekiyor.

Denetim Masası > Sistem > Gelişmiş sistem ayarları > Ortam Değişkenleri... yolunu izle. Bu pencerede karşına düzenli/düzensiz karışık bir sayfa çıkacak(bkz: [pencere1](https://files.catbox.moe/p7qrau.PNG)). İki farklı başlık var gördüğün gibi. Kullanıcı tabanlı değişkenler ve Sistem değişkenleri. Sistem değişkenleri kısmına gel ve ````Path```` adlı değişkeni bulup altındaki düzenle butonunu kullan(bkz: [pencere2](https://files.catbox.moe/624bx0.PNG)). Karşında Ortam değişkenini düzenle adında bir pencere açılacak. Yeni seçeneği ile ilerle(bkz: [pencere3](https://files.catbox.moe/s90pkn.PNG)). Ardından karşına senin için açılmış bir textbox çıkacak. bu kutucuğa FFmpeg'i çıkarttığın konumun tam yolu yazılmalı. Eğer doğrudan masaüstüne atmış isen muhtemel yol şu olur: C:\Users\[kullaniciAdin]\Desktop\ffmpeg. Dosya yolunu ekledikten sonra tamam seçeneği ile ilerle(bkz: [pencere4](https://files.catbox.moe/2pn1x8.png)).

Her şey yolunda gitmişse cmd üzerinden ````ffmpeg -version```` yazdığında ekteki sonucu alacaksın(bkz: [cmd-ek](https://files.catbox.moe/7zgw12.PNG)).

Artık temel kullanıma geçebiliriz. Örneğin Masaüstündeki ````test```` klasörü içinde bulunan ````input.m4a```` dosyasını ````output.mp3```` adında .mp3 formatına çevirmek istediğin bir senaryo düşünürsek, test klasörüne ````convert.bat```` adında bir dosya oluşturup, aşağıdaki kodu dosya içine gömüp çalıştırabilirsin.

````bash
# m4a'dan mp3'e
ffmpeg -i input.m4a output.mp3
````

Unutma, eğer ````convert.bat```` ve convert edilecek ````.m4a dosyası```` aynı konumda değil ise dosya yollarını aşağıdaki gibi belirtmelisin.

````bash
ffmpeg -i "C:\Users\[kullaniciAdin]\Desktop\test\input.m4a" "C:\Users\[kullaniciAdin]\[yuklenecekYol]\output.mp3"
````

Farklı bir senaryoda, Müzikler adında tamamen .m4a dosyalarından oluşan bir klasörün olduğunu varsayalım. Altta vereceğim kodu "convert.bat" adı ile aynı klasöre atıp çalıştırırsan, .m4a formatlı ne kadar dosya var ise hepsini .mp3'e çevirir. Her çeviriden sonra orjinal .m4a dosyasını klasörden siler.

````bash
@echo off
echo tüm .m4a dosyalari .mp3 formatina convert ediliyor...
echo ----------------------------

for %%a in ("*.m4a") do (
    ffmpeg -i "%%a" -codec:a libmp3lame -qscale:a 2 "%%~na.mp3"
    del "%%a"
)

echo ----------------------------
echo tamamlandi.
pause
````

Bu yazımda 2000'den beri geliştirilen, binlerce geliştirici tarafından sürekli güncellenen, Netflix'ten YouTube'a kadar sayısız platformun altyapısında kullanılan FFmpeg'den bahsettim. Öğrenmesi biraz zaman alsa da, multimedya ile uğraşan herkesin mutlaka bilmesi gereken bir araç. Komut satırından korkma, bir süre sonra GUI programlarından çok daha hızlı ve esnek olduğunu göreceksin.

Başka bir yazıda görüşmek üzere...

Kendine iyi bak, iyi şanslar.

