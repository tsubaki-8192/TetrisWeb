# TetrisWeb
Web上で動作するテトリスを作成  
画像等は、PICマイコン用を流用。  
Javascriptやゲーム作成の基礎を習得してもらいたいです。

履歴を追いながら勉強することで、  
実際に自分でTetrisを作るようにしながら  
学べるリポジトリを作りたいです。  

ぜひ活用してください。

<small>このReadmeもできるだけリンクを豊富にして、  
閲覧しやすいようには気を付けます。</small>

## 目次
-	[チャプター](#チャプター)
	0. [使い方](#Chapter0)
	1. [ゲームの基本画面完成まで](#Chapter1)

## [チャプター](#目次)
### [Chapter0](#目次)  
**使い方(4/24 Upload)**  

各種チャプターのコードをダウンロードする方法  
チャプターがわかりやすいよう、僕が更新するときに頑張ります。  

------

以降、解説

![Image1 Chapter0](ForReadme/img0_1.jpg)

更新 = commit(と思って良い)ので、commitの履歴を確認します。  

![Image2 Chapter0](ForReadme/img0_2.jpg)

閲覧したいチャプターのcommitID(?)をクリックし、  
commit情報のページへ

![Image3 Chapter0](ForReadme/img0_3.jpg)

ここで、当該commitにて変更された情報だけを確認できます。  
そうではなく全てのファイルを見たい場合は、Browse Filesで移動

![Image4 Chapter0](ForReadme/img0_4.jpg)

Web上で見ることができるようになります。  

実際に動かしたい場合もあると思います。  
Downlowd ZIPで自分のPCにダウンロードすると良いでしょう。  
Open with...でも大丈夫な気がしますが、使ってないのでわかりません。

> Web上で見ることができるようになります。  

普段はmainブランチ(や、[name]_mainブランチ)を編集していますが、  
別のブランチに移動しているようなものですね。  
各commitにはIDが割り振られており、このような状態復元が可能です。


### [Chapter1](#目次)
**ゲームの基本画面完成まで(4/24 Upload)**  
#### 完成画面

<img src="ForReadme/img1_1.jpg" width="200px" alt="Image4 Chapter0">

---

#### 説明等

他のゲームでも共通の部分が多いので、  
ここは別に、いま深く勉強しなくて良いです。  
特に難しいところもないですが、  
一応テトリスのボード管理は高さ方向に一マス多めに取ってます。  
見えないところにもミノを配置できるようになります。