/*
 * @Description: 多张图片上传压缩
 * @Author: 惜神
 * @Date: 2021-08-17 16:45:27
 */

const fs = require("fs");
const JSZip = require("jszip"); 
const image = require("imageinfo"); 
const zip = new JSZip();
const request = require('request');
const path = require('path');
const QRCode = require('qrcode');


/**
 * 创建新的文件夹用于保存图片（如果有自己的文件夹，可以不使用）
 * @author: 惜神
 * @param {String} dirname 创建文件路径
 * @Date: 2021-08-17 17:36:07
 */
const mkdirSync = (dirname) => {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
    return false
}

/**
 * @author: 惜神
 * @param {String} folderPaths 压缩文件路径
 * @param {String} outPath 压缩文件输出路径
 * @Date: 2021-08-17 17:35:13
 */
const packZipList = (folderPaths, outPath) => {
    const lists = getFiles.getFileList(folderPaths); //获取文件夹里的所有图片文件值
    for (let i = 0; i < lists.length; i++) {
        const data = fs.readFileSync(`${folderPaths}${lists[i].filename}`);
        const suffix = lists[i].filename.split('.')[1];
        zip.file(`photo_${i}.${suffix}`, data, { base64: true });
        delFile(`${folderPaths}${lists[i].filename}`, folderPaths) //调用删除方法
    }
    zip
        .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(fs.createWriteStream(outPath))  //打包后的包名可以自己根据需求定义，路径可以根据需求更改
        .on('finish', () => {
            console.log(`${outPath} written.`);   //管道写完数据后，打印出提示
        });
}

/**
 * 读取文件list
 * @author: 惜神
 * @param {String} path 文件夹路径
 * @Date: 2021-08-17 17:34:21
 */
const readFileList = (path, filesList) => {
    const files = fs.readdirSync(path);
    files.forEach((item) => {
        const stat = fs.statSync(`${path}${item}`);
        if (stat.isDirectory()) {
            //递归读取文件
            readFileList(`${path}${item}/`, filesList)
        } else {
            let obj = {};//定义一个对象存放文件的路径和名字
            obj.path = path;//路径
            obj.filename = item//名字
            filesList.push(obj);
        }
    })
}

/**
 * 获取文件
 * @author: 惜神
 * @Date: 2021-08-17 17:33:58
 */
const getFiles = {
    //获取文件夹下的所有文件
    getFileList: (path) => {
        const filesList = [];
        readFileList(path, filesList);
        return filesList;
    },
    //获取文件夹下的所有图片
    getImageFiles: (path) => {
        const imageList = [];
        this.getFileList(path).forEach((item) => {
            const ms = image(fs.readFileSync(`${item.path}${item.filename}`));
            ms.mimeType && (imageList.push(item.filename))
        });
        return imageList;
    }
};

/**
 * 检查是否是空文件夹
 * @author: 惜神
 * @param {String} file 文件路径
 * @Date: 2021-08-18 14:07:16
 */
const fileExists = (file) => {
    fs.access(`${file}`, fs.constants.F_OK, (err) => {
        if(err) {
            return false
        }
        fs.readdir(`${file}/`,function(err,fileArr){
            if(err){
                return false
            }
            if(fileArr.length === 0) {
                return false
            }
            return true
        })
      });
}

/**
 * 移动文件夹
 * @author: 惜神
 * @param {String} dstpath 加载文件夹路径
 * @param {String} sourcePath 来源文件夹路径
 * @Date: 2021-08-18 12:16:53
 */
const mvFiles = (dstpath, sourcePath) => {
    const status = fileExists(sourcePath);
    if(!status) return;
    fs.rename(sourcePath, dstpath, (err) => {
        if (err) {
            console.log('move file',err)
        }
        mkdirSync(sourcePath)
    })
}

/**
 * 删除文件下的文件
 * @author: 惜神
 * @param {String} path 文件夹下所有图片的路径
 * @param {String} reservePath 文件夹路径
 * @Date: 2021-08-17 17:26:25
 */
const delFile = (path, reservePath) => {
        if (fs.existsSync(path)) {
            if (fs.statSync(path).isDirectory()) {
                let files = fs.readdirSync(path);
                files.forEach((file, index) => {
                    let currentPath = `${path}/${file}`;
                    if (fs.statSync(currentPath).isDirectory()) {
                        delFile(currentPath, reservePath);
                    } else {
                        fs.unlinkSync(currentPath);
                    }
                });
                if (path != reservePath) {
                    fs.rmdirSync(path);
                }
            } else {
                fs.unlinkSync(path);
            }
        }
    }

    /**
     * 图片链接处理
     * @author: 惜神 
     * @param {String} dstpath 打包图片路径
     * @param {String} imageList 图片数组
     * @Date: 2021-08-18 12:17:36
     */    
    const linkTodo = async (dstpath, imageList) => {
        if(imageList && imageList.length === 0) return;
        mkdirSync(dstpath);
        for (const item of imageList) {
            const arg = new URL(item);
            const fileName = arg.pathname.split('/').slice(-1)[0];
            const downloadUrl = `${dstpath}/${fileName}`;
            request(item).pipe(fs.createWriteStream(downloadUrl))
        }
    }
    /**
     * code 处理
     * @author: 惜神
     * @param {String} dstpath 打包图片路径
     * @param {String} codeList code数组
     * @Date: 2021-08-18 12:18:17
     */
    const codeTodo = async (dstpath, codeList) => {
        if(codeList && codeList.length === 0) return;
        mkdirSync(dstpath);
        codeList.forEach(async (code, index) => {
            const fileName = `code_${code}_${index}`;
            const downloadUrl = `${dstpath}/${fileName}.png`;
            try {
                await QRCode.toFile(downloadUrl, code, {
                    color: {
                        dark: '#FFFF',
                        light: '#0000'
                    }
                })
            } catch (err) {
                console.error(err)
            }
        });
    }
    /**
     * 文件目录处理
     * @author: 惜神
     * @param {*} dstpath 打包图片路径
     * @param {*} sourcePath 来源图片路径
     * @Date: 2021-08-18 12:19:42
     */
    const folderTodo = async (dstpath, sourcePath) => {
       await mvFiles(dstpath, sourcePath);
    }

    /**
     * @author: 惜神
     * @param {String} dstpath 导出文件夹路径
     * @param {Array} imageList 图片链接
     * @param {Array} codeList code数组
     * @param {String} sourcePath 图片来源路径
     * @param {String} type 属输入类型
     * @param {String} outPath 压缩图片压缩包输出路径
     * @Date: 2021-08-17 16:58:47
     */
    (async ({ dstpath = "./img", imageList = [], outPath = "out.zip", type =
        "link", codeList = [], sourcePath = "./testImage" }) => {
        const map = {
            'link': await linkTodo(dstpath, imageList),
            'folder': await folderTodo(dstpath, sourcePath),
            'code': await codeTodo(dstpath, codeList)
        }
        console.log(type)
        map[type];
        const folderPaths = `${dstpath}/`;
        setTimeout(() => { packZipList(folderPaths, outPath) }, 1000);
    })(
        /********* 图片链接参数 **********/
        {
            dstpath: "./img",
            imageList: [
                "https://cdn-scp.banu.cn/ideas/ideas/1617243660362-448561514.jpeg",
                "https://cdn-scp.banu.cn/ideas/ideas/1617243660548-7283341.jpeg"
            ],
            outPath: "out.zip",
            type: "link"
        }

        /********** 二维码字符串参数 **********/
        // {
        //     dstpath: "./img",
        //     codeList: ['1','2','桌位码:32'],
        //     outPath: "out.zip",
        //     type: "code"
        // }

        /********** 固定路径图片串参数 **********/
        // {
        //     dstpath: "./img",
        //     sourcePath: "./testImage",
        //     outPath: "out.zip",
        //     type: "folder"
        // }
    )
