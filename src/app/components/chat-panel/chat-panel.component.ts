import { Component, Input, Output, EventEmitter, ViewChild, OnInit,
        OnChanges, AfterViewInit, OnDestroy, HostListener,
        ElementRef, SimpleChanges } from '@angular/core';
import { PerfectScrollbarComponent, PerfectScrollbarDirective } from 'ngx-perfect-scrollbar';
import { Store } from '@ngrx/store';
import { AppStore } from '../../app.store';
import { chatAction } from '../../pages/chat/actions';
import { contactAction } from '../../pages/contact/actions';
import { mainAction } from '../../pages/main/actions';
import { global, emojiConfig, jpushConfig, imgRouter,
        pageNumber, authPayload, StorageService } from '../../services/common';
import { Util } from '../../services/util';
import { Emoji } from '../../services/tools';
import * as download from 'downloadjs';
const avatarErrorIcon = '../../../assets/images/single-avatar.svg';
const imageError = '../../../assets/images/image-error.svg';

@Component({
    selector: 'chat-panel-component',
    templateUrl: './chat-panel.component.html',
    styleUrls: ['./chat-panel.component.scss']
})

export class ChatPanelComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    private util: Util = new Util();
    @ViewChild(PerfectScrollbarComponent) private componentScroll;
    @Input()
        private messageList;
    @Input()
        private active;
    @Input()
        private selfInfo;
    @Input()
        private otherOptionScrollBottom;
    @Input()
        private changeActiveScrollBottom;
    @Output()
        private sendMsg: EventEmitter<any> = new EventEmitter();
    @Output()
        private sendPic: EventEmitter<any> = new EventEmitter();
    @Output()
        private sendFile: EventEmitter<any> = new EventEmitter();
    @Output()
        private sendLocation: EventEmitter<any> = new EventEmitter();
    @Output()
        private saveDraft: EventEmitter<any> = new EventEmitter();
    @Output()
        private otherInfo: EventEmitter<any> = new EventEmitter();
    @Output()
        private selfInfoEmit: EventEmitter<any> = new EventEmitter();
    @Output()
        private groupSetting: EventEmitter<any> = new EventEmitter();
    @Output()
        private addGroup: EventEmitter<any> = new EventEmitter();
    @Output()
        private videoPlay: EventEmitter<any> = new EventEmitter();
    @Output()
        private loadMore: EventEmitter<any> = new EventEmitter();
    @Output()
        private retract: EventEmitter<any> = new EventEmitter();
    @Output()
        private msgTransmit: EventEmitter<any> = new EventEmitter();
    @Output()
        private businessCardSend: EventEmitter<any> = new EventEmitter();
    // @Output()
    //     private msgFile: EventEmitter<any> = new EventEmitter();
    private global = global;
    private change;
    private flag = false;
    private inputNoBlur = true;
    private inputToLast = false;
    private emojiInfo = {
        show: false,
        position: {
            left: 0,
            top: 0
        },
        emojiAlias: emojiConfig,
        jpushAlias: jpushConfig,
        content: '',
        contentId: 'contentDiv'
    };
    private contentDiv;
    private chatStream$;
    private msg = [];
    private groupConversationHover = {
        tip: '多人会话',
        position: {
            left: -40,
            top: 27
        },
        show: false
    };
    private groupSettingHover = {
        tip: '群设置',
        position: {
            left: -28,
            top: 27
        },
        show: false
    };
    private MsgFileHover = {
        tip: '聊天文件',
        position: {
            left: -28,
            top: 27
        },
        show: false
    };
    private loadingFlag = 3;
    private loadingCount = 1;
    private imageViewer = {
        result: [],
        active: {
            index: -1
        },
        show: false,
    };
    private msgFileImageViewer = {
        result: [],
        active: {
            index: -1
        },
        show: false,
    };
    private viewer = {};
    private voiceState = [];
    private loadFlag = false;
    private moreMenu = {
        show: false,
        top: 0,
        left: 0,
        info: [
            {
                key: 0,
                name: '撤回',
                show: true,
                isFirst: true
            },
            {
                key: 1,
                name: '转发',
                show: true,
                isFirst: false
            },
            {
                key: 2,
                name: '复制',
                show: true,
                isFirst: false
            }
        ],
        item: null
    };
    private pasteImage: any = {
        show: false,
        info: {
            src: '',
            width: 0,
            height: 0,
            pasteFile: {}
        }
    };
    private dropFileInfo: any = {
        show: false,
        info: {}
    };
    private atList = {
        show: false,
        list: [],
        left: 0,
        top: 0,
        showAll: true,
        hasMyself: true
    };
    private atDeleteNum = 1;
    private msgFile = {
        show: false,
        audio: [],
        document: [],
        video: [],
        image: [],
        other: []
    };
    private businessCard = {
        show: false,
        info: []
    };
    constructor(
        private store$: Store<AppStore>,
        private storageService: StorageService,
        private elementRef: ElementRef
    ) {

    }
    public ngOnInit() {
        this.subscribeStore();
        // 禁止火狐下点击发送消息的输入框中的表情进行缩放
        document.designMode = 'off';
        document.execCommand('enableObjectResizing', false, 'false');
    }
    public ngOnChanges(changes: SimpleChanges) {
        if (!this.messageList || this.messageList.length === 0) {
            this.messageList = [{
                draft: ''
            }];
        }
        if (!this.active.activeIndex) {
            this.active.activeIndex = 0;
        }
        // 消息面板滚动条向下滚动
        if (changes.otherOptionScrollBottom) {
            this.scrollBottom(150);
        }
        if (changes.changeActiveScrollBottom) {
            this.scrollBottom(150, changes.changeActiveScrollBottom);
        }
    }
    public ngAfterViewInit() {
        this.allPointerToMap();
        this.contentDiv = this.elementRef.nativeElement.querySelector('#contentDiv');
    }
    public ngOnDestroy() {
        this.chatStream$.unsubscribe();
    }
    private scrollBottom (timeout, changeActive ? ) {
        if (changeActive) {
            this.loadFlag = false;
        }
        setTimeout(() => {
            this.componentScroll.directiveRef.update();
            this.componentScroll.directiveRef.scrollToBottom();
            this.contentDiv.focus();
            this.util.focusLast(this.contentDiv);
            if (changeActive) {
                this.loadFlag = true;
            }
        }, timeout);
    }
    @HostListener('document:drop', ['$event']) private onDrop(event) {
        event.preventDefault();
    }
    @HostListener('document:dragleave', ['$event']) private onDragleave(event) {
        event.preventDefault();
    }
    @HostListener('document:dragenter', ['$event']) private ondDagenter(event) {
        event.preventDefault();
    }
    @HostListener('document:dragover', ['$event']) private onDragover(event) {
        event.preventDefault();
    }
    @HostListener('window:click') private onClickWindow() {
        this.inputToLast = true;
        this.inputNoBlur = true;
        this.atList.show = false;
    }
    @HostListener('window:keyup', ['$event']) private onKeyupWindow(event) {
        // 回车发送复制的图片或者拖拽的文件
        if (this.pasteImage.show && event.keyCode === 13) {
            this.pasteImageEmit();
            this.pasteImage = {
                show: false,
                info: {
                    src: '',
                    width: 0,
                    height: 0,
                    pasteFile: {}
                }
            };
        } else if (this.dropFileInfo.show && event.keyCode === 13) {
            this.dropFileEmit();
            this.dropFileInfo = {
                show: false,
                info: {}
            };
        }
    }
    private subscribeStore() {
        this.chatStream$ = this.store$.select((state) => {
            const chatState = state['chatReducer'];
            const contactState = state['contactReducer'];
            this.stateChanged(chatState, contactState);
            return state;
        }).subscribe((state) => {
            // pass
        });
    }
    private stateChanged(chatState, contactState) {
        switch (chatState.actionType) {
            case chatAction.receiveMessageSuccess:
                this.messageList = chatState.messageList;
                if (chatState.activePerson.activeIndex >= 0 && chatState.newMessageIsActive) {
                    let msg = chatState.messageList[chatState.activePerson.activeIndex].msgs;
                    if (msg.length > pageNumber) {
                        this.msg = msg.slice(msg.length - this.msg.length);
                    } else {
                        this.msg = msg;
                    }
                    // 经纬度转换成地图
                    this.pointerToMap(chatState);
                }
                break;
            case mainAction.selectSearchUser:

            case mainAction.createGroupSuccess:

            case chatAction.createOtherChat:

            case contactAction.selectContactItem:

            case chatAction.changeActivePerson:
                this.loadingFlag = 1;
                this.loadingCount = 1;
                let message = chatState.messageList[chatState.activePerson.activeIndex].msgs;
                if (message && message.length > pageNumber) {
                    this.msg = message.slice(message.length - pageNumber);
                } else if (message && message.length <= pageNumber) {
                    this.msg = message;
                }
                this.allPointerToMap();
                this.imageViewer.result = chatState.imageViewer;
                this.voiceState = chatState.voiceState;
                break;
                // 发送群组文件消息
            case chatAction.sendGroupFile:

                // 发送单聊文本消息
            case chatAction.sendSingleMessage:

                // 发送群组文本消息
            case chatAction.sendGroupMessage:

                // 发送单聊图片消息
            case chatAction.sendSinglePic:

                // 发送群组图片消息
            case chatAction.sendGroupPic:

                // 发送单聊文件消息
            case chatAction.sendSingleFile:

                // 发送群组文件消息
            case chatAction.sendGroupFile:
                this.updateMsg(chatState);
                this.imageViewer.result = chatState.imageViewer;
                break;
            case chatAction.transmitSingleMessage:

                // 转发单聊图片消息
            case chatAction.transmitSinglePic:

                // 转发单聊文件消息
            case chatAction.transmitSingleFile:

                // 转发群聊文本消息
            case chatAction.transmitGroupMessage:

                // 转发单聊图片消息
            case chatAction.transmitGroupPic:

                // 转发单聊文件消息
            case chatAction.transmitGroupFile:

                // 转发单聊位置
            case chatAction.transmitSingleLocation:

                // 转发群聊位置
            case chatAction.transmitGroupLocation:
                if (this.active.type === 3 &&
                    chatState.newMessage.content.target_id === this.active.name) {
                    this.updateMsg(chatState);
                    this.pointerToMap(chatState);
                    this.scrollBottom(0);
                    this.imageViewer.result = chatState.imageViewer;
                } else if (this.active.type === 4 &&
                    Number(chatState.newMessage.key) === Number(this.active.key)) {
                    this.updateMsg(chatState);
                    this.pointerToMap(chatState);
                    this.scrollBottom(0);
                    this.imageViewer.result = chatState.imageViewer;
                }
                break;
            case chatAction.getAllMessageSuccess:
                if (chatState.imageViewer !== []) {
                    this.imageViewer.result = chatState.imageViewer;
                }
                break;
            case chatAction.sendMsgComplete:

            case chatAction.addGroupMembersEventSuccess:

            case chatAction.msgRetractEvent:

            case chatAction.saveMemoNameSuccess:

            case contactAction.agreeAddFriendSuccess:

            case chatAction.friendReplyEventSuccess:

            case chatAction.updateGroupInfoEventSuccess:

            case chatAction.userInfUpdateEventSuccess:

            case chatAction.transmitMessageComplete:

            case chatAction.msgReceiptChangeEvent:

            case chatAction.deleteGroupMembersEvent:

            case chatAction.exitGroupEvent:
                this.updateMsg(chatState);
                break;
            case chatAction.msgFile:
                this.msgFile = chatState.msgFile;
                break;
            case chatAction.msgFileSuccess:
                this.msgFileImageViewer.result = chatState.msgFileImageViewer;
                break;
            case chatAction.dispatchFriendList:
                this.businessCard.info = contactState.friendList;
                break;
            default:
        }
    }
    private updateMsg(chatState) {
        console.log(44444);
        if (chatState.activePerson.activeIndex < 0) {
            return ;
        }
        let list = chatState.messageList[chatState.activePerson.activeIndex];
        if (list.msgs.length > pageNumber) {
            this.msg = list.msgs.slice(list.msgs.length - this.msg.length);
        } else {
            this.msg = list.msgs;
        }
        this.messageList = chatState.messageList;
    }
    private msgMouseleave() {
        this.moreMenu.show = false;
    }
    private menuItemEnterEmit() {
        this.menuMouse(true);
    }
    private menuItemLeaveEmit() {
        this.menuMouse(false);
    }
    private menuMouse(isShow) {
        for (let item of this.msg) {
            if (this.moreMenu.item.msg_id === item.msg_id) {
                item.showMoreIcon = isShow;
                break;
            }
        }
    }
    // 点击更多列表的元素
    private selectMoreMenuItemEmit(item) {
        switch (item.key) {
            case 0:
                this.retract.emit(this.moreMenu.item);
                break;
            case 1:
                this.msgTransmit.emit(this.moreMenu.item);
                break;
            default:
        }
        this.moreMenu.show = false;
    }
    private showYouMoreText(event, item, more) {
        const showArr = [false, true, true];
        const isFirstArr = [false, true, false];
        this.menuOption(this.moreMenu.info, showArr, isFirstArr);
        this.moreOperation(event, item, more);
    }
    private showYouMoreOther(event, item, more) {
        const showArr = [false, true, false];
        const isFirstArr = [false, true, false];
        this.menuOption(this.moreMenu.info, showArr, isFirstArr);
        this.moreOperation(event, item, more);
    }
    private showMeMoreText(event, item, more) {
        const showArr = [true, true, true];
        const isFirstArr = [true, false, false];
        this.menuOption(this.moreMenu.info, showArr, isFirstArr);
        this.moreOperation(event, item, more);
    }
    private showMeMoreOther(event, item, more) {
        const showArr = [true, true, false];
        const isFirstArr = [true, false, false];
        this.menuOption(this.moreMenu.info, showArr, isFirstArr);
        this.moreOperation(event, item, more);
    }
    private showMeMoreVoice(event, item, more) {
        const showArr = [true, false, false];
        const isFirstArr = [true, false, false];
        this.menuOption(this.moreMenu.info, showArr, isFirstArr);
        this.moreOperation(event, item, more);
    }
    // 更多列表的配置
    private menuOption (info, showArr, isFirstArr) {
        for (let i = 0; i < showArr.length; i++) {
            info[i].show = showArr[i];
        }
        for (let i = 0; i < isFirstArr.length; i++) {
            info[i].isFirst = isFirstArr[i];
        }
    }
    // 更多列表的位置
    private moreOperation(event, item, more) {
        let result = this.moreMenu.info.filter((info) => {
            return info.show === true;
        });
        this.moreMenu.show = !this.moreMenu.show;
        if (this.moreMenu.show) {
            this.moreMenu.top = event.clientY - event.offsetY + 20;
            this.moreMenu.left = event.clientX - event.offsetX;
            this.moreMenu.item = item;
        }
    }
    // 图片预览
    private imageViewerShow(src, item) {
        for (let i = 0; i < this.imageViewer.result.length; i++) {
            let msgIdFlag = this.imageViewer.result[i].msg_id === item.msg_id && item.msg_id;
            let msgKeyFlag = this.imageViewer.result[i].msgKey === item.msgKey && item.msgKey;
            if (msgIdFlag || msgKeyFlag) {
                this.imageViewer.active = Object.assign({}, this.imageViewer.result[i], {});
                this.imageViewer.active.index = i;
                break;
            }
        }
        this.imageViewer.show = true;
        this.viewer = this.imageViewer;
    }
    // 切换会话人渲染地图
    private allPointerToMap(index ?: number) {
        const num = index ? index : this.msg.length;
        for (let i = 0 ; i < num; i++) {
            if (this.msg[i].content.msg_type === 'location') {
                const that = this;
                ((indexNum) => {
                    setTimeout(function () {
                        if (!that.msg[indexNum] || !that.msg[indexNum].content ||
                            !that.msg[indexNum].content.msg_body.longitude) {
                                clearInterval(this);
                                return ;
                        }
                        that.util.theLocation({
                            id: 'allmap' + indexNum,
                            longitude: that.msg[indexNum].content.msg_body.longitude,
                            latitude: that.msg[indexNum].content.msg_body.latitude
                        });
                    }, 0);
                })(i);
            }
        }
    }
    // 接收到地图消息渲染地图
    private pointerToMap(chatState) {
        if (chatState.newMessage.content.msg_type === 'location') {
            setTimeout(() => {
                this.util.theLocation({
                    id: 'allmap' + (this.msg.length - 1).toString(),
                    longitude: chatState.newMessage.content.msg_body.longitude,
                    latitude: chatState.newMessage.content.msg_body.latitude
                });
            }, 100);
        }
    }
    // 粘贴文本，将文本多余的样式代码去掉/粘贴图片
    private pasteMessage(event) {
        let clipboardData = event.clipboardData || (<any> window).clipboardData;
        let items = clipboardData.items;
        let files = clipboardData.files;
        let item;
        // 粘贴图片不兼容safari
        let userAgent = navigator.userAgent;
        let isSafari = userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1;
        if (!isSafari) {
            if (files && files.length) {
                this.getImgObj(files[0]);
            } else if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].kind === 'file' && items[i].type.match(/^image\//i)) {
                        item = items[i];
                        break;
                    }
                }
            }
            if (item) {
                this.getImgObj(item.getAsFile());
            }
        }
        let pastedData = clipboardData.getData('Text');
        pastedData = pastedData.replace(/</g, '&lt;');
        pastedData = pastedData.replace(/>/g, '&gt;');
        pastedData = pastedData.replace(/\n/g, '<br>');
        pastedData = pastedData.replace(/ /g, '&nbsp;');
        pastedData = Emoji.emoji(pastedData, 18);
        this.util.insertAtCursor(this.contentDiv, pastedData, false);
        return false;
    }
    // 粘贴图片发送
    private pasteImageEmit() {
        let img = new FormData();
        img.append(this.pasteImage.info.pasteFile.name, this.pasteImage.info.pasteFile);
        this.sendPic.emit({
            img,
            type: 'paste',
            info: this.pasteImage.info
        });
    }
    private dropArea(event) {
        event.preventDefault();
        let fileList = event.dataTransfer.files;
        if (fileList.length === 0) {
            return false;
        }
        // 检测文件是不是图片
        if (fileList[0].type.indexOf('image') === -1) {
            this.dropFileInfo.info = fileList[0];
            this.dropFileInfo.show = true;
        } else {
            this.getImgObj(fileList[0]);
        }
    }
    private dropFileEmit() {
        let file = new FormData();
        file.append(this.dropFileInfo.info.name, this.dropFileInfo.info);
        this.sendFile.emit({
            file,
            fileData: this.dropFileInfo.info
        });
    }
    // 获取拖拽时或者粘贴图片时的图片对象
    private getImgObj(file) {
        const that = this;
        let img = new Image();
        let pasteFile = file;
        let reader = new FileReader();
        reader.readAsDataURL(pasteFile);
        reader.onload = function(e){
            img.src = this.result;
            const _this = this;
            img.onload = function(){
                that.pasteImage.info = {
                    src: _this.result,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    pasteFile
                };
                that.pasteImage.show = true;
            };
        };
    }
    // 发送文本
    private sendMsgAction() {
        let draft = this.contentDiv.innerHTML;
        console.log(777, draft);
        if (draft) {
            draft = draft.replace(/^(<br>){1,}$/g, '');
            draft = draft.replace(/&nbsp;/g, ' ');
            draft = draft.replace(/<br>/g, '\n');
            const imgReg = new RegExp(`<img.+?${imgRouter}.{1,}?\.png".*?>`, 'g');
            if (draft.match(imgReg)) {
                let arr = draft.match(imgReg);
                for (let item of arr) {
                    let str = item.split(`src="${imgRouter}`)[1];
                    let str2 = str.split('.png"')[0];
                    draft = draft.replace(item, Emoji.convert(str2));
                }
            }
            const atInputReg = new RegExp(`<input.+?class="chat-panel-at-input".+?>`, 'g');
            let atList = [];
            let isAtAll = false;
            if (draft.match(atInputReg)) {
                let arr = draft.match(atInputReg);
                let usernameArr = [];
                for (let item of arr) {
                    let str1 = item.split('username="')[1];
                    let username = str1.split(' ')[0];
                    let str2 = item.split('appkey="')[1];
                    let appkey = str2.split(' ')[0];
                    draft = draft.replace(item, '@' + username + ' ');
                    usernameArr.push({
                        username,
                        appkey
                    });
                    if (username === '所有成员') {
                        isAtAll = true;
                    }
                }
                if (!isAtAll) {
                    for (let item of usernameArr){
                        let result = atList.filter((atItem) => {
                            return atItem.username === item.username;
                        });
                        if (result.length === 0) {
                            atList.push(item);
                        }
                    }
                }
            }
            draft = draft.replace(new RegExp('&lt;', 'g'), '<');
            draft = draft.replace(new RegExp('&gt;', 'g'), '>');
            this.sendMsg.emit({
                content: draft,
                atList,
                isAtAll
            });
            this.messageList[this.active.activeIndex].draft = '';
            this.flag = true;
            this.contentDiv.innerHTML = '';
        }
    }
    // 发送图片
    private sendPicAction(event) {
        // 为了防止首次选择了文件，第二次选择文件的时候点击取消按钮时触发change事件的报错
        if (!event.target.files[0]) {
            return;
        }
        let img = this.util.getFileFormData(event.target);
        this.sendPic.emit({
            img,
            type: 'send'
        });
        this.contentDiv.focus();
        this.util.focusLast(this.contentDiv);
        event.target.value = '';
    }
    // 发送文件
    private sendFileAction(event) {
        // 为了防止首次选择了文件，第二次选择文件的时候点击取消按钮时触发change事件的报错
        if (!event.target.files[0]) {
            return;
        }
        let file = this.util.getFileFormData(event.target);
        this.sendFile.emit({
            file,
            fileData: event.target.files[0]
        });
        this.contentDiv.focus();
        this.util.focusLast(this.contentDiv);
        event.target.value = '';
    }
    private msgContentChange(event) {
        let active = Object.assign({}, this.active, {});
        let value = event.target.innerHTML;
        const atInputReg = new RegExp(`<input.+?class="chat-panel-at-input".+?>`, 'g');
        if (value.match(atInputReg)) {
            let arr = value.match(atInputReg);
            for (let item of arr) {
                let str1 = item.split('value="@')[1];
                let username = str1.split(' ')[0];
                value = value.replace(item, '@' + username + ' ');
            }
        }
        value = value.replace(/^<br>?/, '');
        // 防止点击发送的时候或者点击emoji的时候触发保存草稿
        setTimeout(() => {
            if (this.inputNoBlur) {
                if (this.flag === true) {
                    value = '';
                    this.flag = false;
                }
                this.saveDraft.emit([value, active]);
            }
        }, 200);
    }
    private msgContentFocus() {
        this.flag = false;
        this.store$.dispatch({
            type: chatAction.msgFile,
            payload: {
                show: false
            }
        });
        this.store$.dispatch({
            type: chatAction.groupSetting,
            payload: {
                show: false
            }
        });
    }
    private watchOtherInfo(content) {
        let username = content.from_id ? content.from_id : content.name;
        let info: any = {
            username
        };
        if (content.hasOwnProperty('avatarUrl')) {
            info.avatarUrl = content.avatarUrl;
        }
        this.otherInfo.emit(info);
    }
    private watchBusinessCardInfo(extras) {
        let info: any = {
            username: extras.userName
        };
        if (extras.avatarUrl) {
            info.avatarUrl = extras.avatarUrl;
        }
        if (extras.userName === global.user) {
            this.selfInfoEmit.emit();
        } else {
            this.otherInfo.emit(info);
        }
    }
    private watchSelfInfo() {
        this.selfInfoEmit.emit();
    }
    private groupSettingAction(event) {
        event.stopPropagation();
        this.groupSetting.emit();
    }
    private showEmojiPanel(event) {
        this.inputNoBlur = false;
        event.stopPropagation();
        this.contentDiv.focus();
        if (this.inputToLast) {
            this.util.focusLast(this.contentDiv);
        }
        this.emojiInfo.content = this.messageList[this.active.activeIndex];
        if (this.emojiInfo.show === true) {
            this.emojiInfo.show = false;
            setTimeout(() => {
                this.inputNoBlur = true;
            }, 200);
        } else {
            this.emojiInfo.show = true;
        }
    }
    private msgContentClick(event) {
        this.inputToLast = false;
        event.stopPropagation();
        this.atList.show = false;
    }
    // 输入框keydown，ctrl + enter换行，enter发送消息，@用户
    private preKeydown(event) {
        if (event.keyCode === 13 && event.ctrlKey) {
            const contentId =
                this.elementRef.nativeElement.querySelector('#' + this.emojiInfo.contentId);
            let insertHtml = '<br>';
            if (window.getSelection) {
                let next = window.getSelection().focusNode.nextSibling;
                do {
                    if (!next || next.nodeValue || 'BR' === (next as HTMLElement).tagName) {
                        break;
                    }
                } while (next = next.nextSibling);
                next || (insertHtml += insertHtml);
                if (next && next.nodeName === '#text' && insertHtml !== '<br><br>' &&
                    event.target.innerHTML && !event.target.innerHTML.match(/<br>$/ig)) {
                    insertHtml += insertHtml;
                }
                if (!event.target.innerHTML) {
                    insertHtml += insertHtml;
                }
            }
            this.util.insertAtCursor(contentId, insertHtml, false);
        } else if (event.keyCode === 13) {
            this.sendMsgAction();
            event.preventDefault();
        }
    }
    // 输入框keyup
    private preKeyup(event) {
        if (this.active.type === 3) {
            return ;
        }
        let selection = window.getSelection();
        let range = selection.getRangeAt(0);
        let memberList = this.messageList[this.active.activeIndex].groupSetting.memberList;
        if (event.code === 'Digit2' && event.shiftKey) {
            this.showAtList(range, memberList, true);
        } else {
            const text = range.endContainer.nodeValue;
            const index = range.endOffset;
            let letter = '';
            let at = '';
            if (text) {
                letter = text.substring(index - 1, index).toUpperCase();
                if (letter !== '@') {
                    at = text.substring(index - 2, index - 1);
                    let hasAt = text.substring(0, index).lastIndexOf('@');
                    if (at === '@') {
                        let newList = [];
                        for (let item of memberList) {
                            if (item.memo_name &&
                                item.memo_name.toUpperCase().indexOf(letter) !== -1) {
                                item.match = 'memo_name';
                                newList.push(item);
                                continue ;
                            }
                            if (item.nickName &&
                                item.nickName.toUpperCase().indexOf(letter) !== -1) {
                                item.match = 'nickName';
                                newList.push(item);
                                continue ;
                            }
                            if (item.username.toUpperCase().indexOf(letter) !== -1) {
                                item.match = 'username';
                                newList.push(item);
                                continue ;
                            }
                            if (item.memo_nameFirstLetter && item.memo_nameFirstLetter === letter) {
                                item.match = 'memo_name';
                                newList.push(item);
                                continue ;
                            }
                            if (item.nickNameFirstLetter && item.nickNameFirstLetter === letter) {
                                item.match = 'nickName';
                                newList.push(item);
                                continue ;
                            }
                            if (item.usernameFirstLetter === letter) {
                                item.match = 'username';
                                newList.push(item);
                                continue ;
                            }
                            item.match = '';
                        }
                        this.atDeleteNum = 2;
                        if (newList.length > 0) {
                            this.showAtList(range, newList, false);
                        } else {
                            this.atList.show = false;
                        }
                    } else if (hasAt !== -1) {
                        this.atDeleteNum = index - hasAt;
                        letter = text.substr(hasAt + 1, this.atDeleteNum - 1).toUpperCase();
                        let newList = [];
                        for (let item of memberList) {
                            if (item.memo_name &&
                                item.memo_name.toUpperCase().indexOf(letter) !== -1) {
                                item.match = 'memo_name';
                                newList.push(item);
                                continue ;
                            }
                            if (item.nickName &&
                                item.nickName.toUpperCase().indexOf(letter) !== -1) {
                                item.match = 'nickName';
                                newList.push(item);
                                continue ;
                            }
                            if (item.username.toUpperCase().indexOf(letter) !== -1) {
                                item.match = 'username';
                                newList.push(item);
                                continue ;
                            }
                            item.match = '';
                        }
                        if (newList.length > 0) {
                            this.showAtList(range, newList, false);
                        } else {
                            this.atList.show = false;
                        }
                    } else {
                        this.atList.show = false;
                    }
                } else {
                    this.atDeleteNum = 1;
                    this.showAtList(range, memberList, true);
                }
            } else {
                this.atList.show = false;
            }
        }
    }
    // 显示@列表
    private showAtList(range, list, showAll) {
        let hasMyself = false;
        for (let item of list) {
            if (item.username === global.user) {
                hasMyself = true;
                break;
            }
        }
        const position = this.util.getOffset(this.contentDiv);
        this.atList = {
            show: true,
            left: position.left,
            top: position.top,
            list,
            showAll,
            hasMyself
        };
    }
    // 选择@列表
    private selectAtItemEmit(item) {
        let selection = window.getSelection();
        let range = selection.getRangeAt(0);
        this.inputNoBlur = false;
        // 计算@xxx的宽度
        let span = document.createElement('span');
        span.innerHTML = `@${item.nickName || item.username}&nbsp;`;
        span.style.fontSize = '14px';
        document.body.appendChild(span);
        const inputWidth = span.offsetWidth;
        document.body.removeChild(span);
        // 删除原来的@ 或者 @xxx
        let textNode = range.startContainer;
        range.setStart(textNode, range.endOffset - this.atDeleteNum);
        range.setEnd(textNode, range.endOffset);
        range.deleteContents();
        // 输入框中插入@XXX
        const content = `<input style="width: ${inputWidth + 'px'}"
                        type="text" class="chat-panel-at-input"
                        value="@${item.nickName || item.username} "
                        username="${item.nickName || item.username} " appkey="${item.appkey} "/>`;
        this.util.insertAtCursor(this.contentDiv, content, false);
        this.atList.show = false;
        setTimeout(() => {
            this.inputNoBlur = true;
            this.inputAtEvent();
        }, 300);
    }
    // 给@xxx绑定事件
    private inputAtEvent() {
        let inputArray: any = document.getElementsByClassName('chat-panel-at-input');
        for (let input of inputArray) {
            input.onclick = null;
            input.addEventListener('click', (event) => {
                event.stopPropagation();
                this.inputNoBlur = false;
                let selection = window.getSelection();
                let range = selection.getRangeAt(0);
                let textNode = range.startContainer;
                range.setStart(textNode, range.endOffset);
                range.setEnd(textNode, range.endOffset);
                this.contentDiv.focus();
            }, false);
        }
    }
    // 消息发送失败后点击重发消息
    private repeatSendMsgAction(item) {
        item.success = 1;
        item.repeatSend = true;
        this.sendMsg.emit(item);
    }
    private repeatSendPicAction(item) {
        item.success = 1;
        item.repeatSend = true;
        this.sendPic.emit(item);
    }
    private repeatSendFileAction(item) {
        item.success = 1;
        item.repeatSend = true;
        this.sendFile.emit(item);
    }
    private repeatSendLocationAction(item) {
        item.success = 1;
        item.repeatSend = true;
        this.sendLocation.emit(item);
    }
    private avatarErrorIcon(event) {
        event.target.src = avatarErrorIcon;
    }
    // 向上滚动加载更多消息
    private scrollTopEvent() {
        if (!this.loadFlag) {
            return;
        }
        /**
         * this.loadingFlag
         * value    1           2           3
         * state 更多消息   正在加载消息  没有更多了
         */
        if (this.loadingFlag === 1 && this.msg.length >= pageNumber) {
            this.loadingFlag = 2;
            const oldContentHeight = this.componentScroll.directiveRef.geometry().h;
            const activeKey = this.active.key;
            this.loadingCount ++;
            this.loadMore.emit({
                loadingCount: this.loadingCount
            });
            setTimeout(() => {
                if (activeKey !== this.active.key || !this.messageList[this.active.activeIndex]) {
                    return;
                }
                this.componentScroll.directiveRef.update();
                this.componentScroll.directiveRef.scrollTo(0, 10);
                let msgs = this.messageList[this.active.activeIndex].msgs;
                if (msgs.length === this.msg.length) {
                    this.loadingFlag = 3;
                } else {
                    const oldLength = this.msg.length;
                    if (msgs.length <= pageNumber * this.loadingCount) {
                        this.msg = msgs;
                        setTimeout(() => {
                            this.loadingFlag = 3;
                        }, 0);
                    } else {
                        this.msg = msgs.slice(msgs.length - pageNumber * this.loadingCount);
                        setTimeout(() => {
                            this.loadingFlag = 1;
                        }, 0);
                    }
                    const newLength = this.msg.length;
                    this.allPointerToMap(newLength - oldLength);
                    const that = this;
                    return new Promise ((resolve, reject) => {
                        setTimeout(() => {
                            const newContentHeight = that.componentScroll.directiveRef.geometry().h;
                            const gap = newContentHeight - oldContentHeight;
                            that.componentScroll.directiveRef.scrollTo(0, gap);
                            resolve();
                        }, 0);
                    }).catch(() => {
                        console.log('Promise Rejected');
                    });
                }
            }, 500);
        }
    }
    private scrollY() {
        let domArr = document.getElementsByClassName('msg-dom');
        let offsetHeight = this.elementRef.nativeElement.querySelector('#imgViewer').offsetHeight;
        let scrollTop = this.componentScroll.directiveRef.geometry().y;
        let scrollHeight = this.componentScroll.directiveRef.geometry().h;
        let readObj;
        if (this.active.type === 3) {
            readObj = {
                username: this.active.name,
                // appkey: this.active.appkey,
                msg_id: [],
                type: 3
            };
        } else {
            readObj = {
                gid: this.active.key,
                msg_id: [],
                type: 4
            };
        }
        for (let i = 0; i < domArr.length; i ++) {
            let offsetTop = (domArr[i] as HTMLDivElement).offsetTop;
            if (scrollTop <= offsetTop && offsetTop <= scrollTop + offsetHeight) {
                if (this.msg[i].content.from_id !== global.user) {
                    readObj.msg_id.push(this.msg[i].msg_id);
                }
            }
        }
        this.store$.dispatch({
            type: chatAction.addReceiptReportAction,
            payload: readObj
        });
    }
    private addGroupAction() {
        this.addGroup.emit();
    }
    private msgFileAction(event) {
        event.stopPropagation();
        // this.msgFile.emit();
        this.msgFile.show = true;
        this.store$.dispatch({
            type: chatAction.msgFile,
            payload: {
                active: this.active,
                messageList: this.messageList,
                type: 'image',
                show: true
            }
        });
    }
    private contentFocus(event) {
        event.stopPropagation();
        this.contentDiv.focus();
        this.util.focusLast(this.contentDiv);
        this.emojiInfo.show = false;
    }
    // 播放语音
    private playVoice(index) {
        const audio = this.elementRef.nativeElement.querySelector('#audio' + index);
        if (audio.paused) {
            this.clearVoicePlay(index);
            audio.play();
            this.msg[index].content.playing = true;
            // 如果是未读
            if (!this.msg[index].content.havePlay) {
                let voiceState = {
                    key: this.active.key,
                    msgId: this.msg[index].msg_id
                };
                this.voiceState.push(voiceState);
                this.msg[index].content.havePlay = true;
                const key = `voiceState-${authPayload.appKey}-${global.user}`;
                const value = JSON.stringify(this.voiceState);
                this.storageService.set(key, value);
            }
        } else {
            audio.pause();
            this.msg[index].content.playing = false;
        }
    }
    // 清除语音播放
    private clearVoicePlay(index) {
        for (let i = 0; i < this.msg.length; i++) {
            if (this.msg[i].content.msg_type === 'voice' &&
                this.msg[i].content.playing && i !== index) {
                const otherAudio = this.elementRef.nativeElement.querySelector('#audio' + i);
                otherAudio.pause();
                otherAudio.currentTime = 0;
                this.msg[i].content.playing = false;
            }
        }
    }
    // 语音播放完成
    private voiceEnded(index) {
        const audio = this.elementRef.nativeElement.querySelector('#audio' + index);
        this.msg[index].content.playing = false;
        audio.currentTime = 0;
        audio.pause();
    }
    // 语音加载完成
    private voiceLoad(index) {
        const audio = this.elementRef.nativeElement.querySelector('#audio' + index);
        this.msg[index].content.load = 1;
    }
    // 视频开始加载
    private videoLoadStart(index) {
        const that = this;
        this.msg[index].content.timer4 = setInterval(function () {
            if (!that.msg[index] || !that.msg[index].content) {
                clearInterval(this);
                return ;
            }
            if (that.msg[index].content.range < 90) {
                that.msg[index].content.range ++;
            }
        }, 100);
    }
    // 视频加载完成
    private videoLoad(index) {
        this.msg[index].content.duration =
            Math.floor(this.elementRef.nativeElement.querySelector('#video' + index).duration);
        this.msg[index].content.load = 1;
        clearInterval(this.msg[index].content.timer4);
        this.msg[index].content.range = 0;
    }
    private playVideo(url) {
        this.videoPlay.emit(url);
    }
    private avatarLoad(event) {
        if (event.target.naturalHeight >= event.target.naturalWidth) {
            event.target.style.width = '100%';
            event.target.style.height = 'auto';
        } else {
            event.target.style.height = '100%';
            event.target.style.width = 'auto';
        }
    }
    private stopPropagation(event) {
        event.stopPropagation();
    }
    private fileDownload(url) {
        // 为了兼容火狐下a链接下载，引入downloadjs
        download(url);
    }
    // 20s内图片没有加载成功，则显示默认图
    private imageError(event, i) {
        setTimeout(() => {
            if (event.target.src.indexOf('undefined') !== -1) {
                event.target.src = imageError;
                i.content.msg_body.width = 128;
                i.content.msg_body.height = 91;
            }
        }, 20000);
    }
    private changeMsgFileEmit(type) {
        this.store$.dispatch({
            type: chatAction.msgFile,
            payload: {
                active: this.active,
                messageList: this.messageList,
                type
            }
        });
    }
    private showMsgFileImageViewerEmit(item) {
        for (let i = 0; i < this.msgFileImageViewer.result.length; i++) {
            let msgIdFlag = this.msgFileImageViewer.result[i].msg_id === item.msg_id && item.msg_id;
            let msgKeyFlag = this.msgFileImageViewer.result[i].msgKey === item.msgKey &&
                            item.msgKey;
            if (msgIdFlag || msgKeyFlag) {
                this.msgFileImageViewer.active =
                    Object.assign({}, this.msgFileImageViewer.result[i], {});
                this.msgFileImageViewer.active.index = i;
                break;
            }
        }
        this.msgFileImageViewer.show = true;
        this.viewer = this.msgFileImageViewer;
    }
    private fileImageLoadEmit(message) {
        this.store$.dispatch({
            type: chatAction.fileImageLoad,
            payload: message
        });
    }
    private unreadList(message) {
        if (message.unread_count > 0 && this.active.type === 4) {
            this.store$.dispatch({
                type: chatAction.watchUnreadList,
                payload: message
            });
        }
    }
     private showBusinessCardModal() {
         this.businessCard.show = true;
     }
     private businessCardSendEmit(user) {
        this.businessCardSend.emit(user);
     }
}
