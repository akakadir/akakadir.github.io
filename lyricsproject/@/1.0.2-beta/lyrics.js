// lyrics.js made by kadir


// chill vibes for title
var vibes = [

'basaramam, sensiz yasayamam', 
'zaten benimle hep yabancıydın', 
'gerek yok artık aglamana', 
'gece boyu dusunup yine uyuyamamak', 
'teşekkür ederim her şey için', 
'essitalopram, zihnim çok bitkin', 
'bitti mi hikayemiz?', 
'kimin için varsın senin için varken ben', 
'eros okların yerinde kalsın', 
'incelince kopmadık ki biz bi anda parçalandık', 
'bir olmayı becerdik biz olmayı beceremedik', 
'bok var gibi yüreğime düştün', 
'bir defa daha yazsa bebeğim, bebeğim, bebeğim',
'özledim seni harbiden', 
'belki de seni hala deli gibi seviyorumdur', 
'öylece sevdiğim kadının, gidişini izledim', 
'kediler ve sarkilar bize yeterli degil', 
'artık daha az seviyorum seni, unutuyor gibi, ölüyor gibi', 
'mutlu ol olduğun yerde eğlen kendince', 
'mutluyum, inan. anladım bir şanstı bu', 
'benimdin eskiden, evimdin eskiden', 
'benim herkesi, o da benim herkesim', 
'anladım ki herkes gibi bir gün gidersin', 
'bu yol karanlık ve korktun biraz', 
'ben nasıl bir adamım hiç sevilmemişim', 
'gönül ister her gece seni', 
'sev sen sevgili ekseninde sersefilim ben senin', 
'yalnızken ve sana uzakta öyle soğuk, anlamsız ki her şey', 
'alışabilirim kaybolmana vazgeçişin canımı yaksa da', 
'içindeki ben hiç ölmesin', 
'yine geldim sokağına, gece boyu yürümüşüm', 
'yarıda bırakacak mecalim yok', 
'kimsin? nası geldin? beni buldun, geri gitme', 
'yağmuru olacakken bulutun sen', 
'gecenin köründe düşüyorsun aklıma birden', 
'daha fazla kendini kandırmak yok', 
'tükendiğimde ise izmarit gibi savurdun', 
'yine de sarılırdım, belki sıkılırdım', 
'sigarayı da seni de bırakırdım güya', 
'tebrik ederim beni pes ettirdin',

];

var ly1 = vibes[Math.floor(Math.random()*vibes.length)];
$('.vibes').html(ly1);


// random tracks
var tracks = [

'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/wGhigTjGHOA" title="1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/ebGMKPnWnxA" title="2" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/tOpufVIjk2E" title="3" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/h-hjvXaVYn0" title="4" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/FFg7WLJy5bA" title="5" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/WwZopSY49Xk" title="6" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/nLWRH4lXEDE" title="7" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/9Ptqc77SIFI" title="8" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/Es5AG3lsSNw" title="9" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/92K8_6LPl5k" title="10" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/DBnxlXfdiPI" title="11" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/DSRHfUDuC9M" title="12" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/fSK564Cyg5Y" title="13" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/n21G9MLvpI0" title="14" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/2NGuB7xYNEo" title="15" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/6DPn7bKfdEc" title="16" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/GgkiliZehuw" title="17" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/YYykUhAj9RI" title="18" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/oJ_NSPSBqNU" title="19" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/Xf_3T7nOrDQ" title="20" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/lr6-Q-ZhejQ" title="21" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/3bfkyXtuIXk" title="22" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/mGr_5vbL80Y" title="23" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/XGWQXjyUip8" title="24" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/yoNzzWRye7c" title="25" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/4ZPuGxdDf_4" title="26" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/8opAVxkwa9Y" title="27" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/MqEVljq65kY" title="28" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 
'<iframe width="250" height="250" src="https://www.youtube-nocookie.com/embed/hx0d8hWvr4c" title="29" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>', 

];

var ly2 = tracks[Math.floor(Math.random()*tracks.length)];
$('.tracks').html(ly2);


// last update 11/2021