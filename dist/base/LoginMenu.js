/**
 * Created by Samuel Gratzl on 28.02.2017.
 */
import { BaseUtils, EventHandler, PluginRegistry } from 'phovea_core';
import { EXTENSION_POINT_CUSTOMIZED_LOGIN_FORM } from './extensions';
import { LoginUtils } from './LoginUtils';
import { SessionWatcher } from './watcher';
// const DEFAULT_SESSION_TIMEOUT = 60 * 1000; // 10 min
import '../scss/main.scss';
import { I18nextManager } from 'phovea_core';
/**
 * utility login menu that can be added to the Appheader for instance
 */
export class LoginMenu extends EventHandler {
    constructor(adapter, options = {}) {
        super();
        this.adapter = adapter;
        this.options = {
            loginForm: undefined,
            document,
            watch: false
        };
        BaseUtils.mixin(this.options, options);
        this.customizer = PluginRegistry.getInstance().listPlugins(EXTENSION_POINT_CUSTOMIZED_LOGIN_FORM);
        this.node = this.init();
        if (this.options.watch) {
            SessionWatcher.startWatching(() => this.logout());
        }
    }
    init() {
        const doc = this.options.document;
        const ul = doc.createElement('ul');
        ul.classList.add('nav', 'navbar-nav', 'navbar-right');
        ul.innerHTML = `
      <li id="login_menu">
        <a data-toggle="modal" data-target="#loginDialog" href="#">
        <i class="fa fa-user fa-fw" aria-hidden="true"></i>
        </a></li>
        <li style="display: none" class="dropdown" id="user_menu">
            <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true"
               aria-expanded="false"><i class="fa fa-user" aria-hidden="true"></i> <span>${I18nextManager.getInstance().i18n.t('phovea:security_flask.unknown')}</span></a>
            <ul class="dropdown-menu">
                <li><a href="#" id="logout_link">${I18nextManager.getInstance().i18n.t('phovea:security_flask.logoutButton')}</a></li>
            </ul>
        </li>`;
        ul.querySelector('#logout_link').addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            this.logout();
        });
        const dialog = this.initLoginDialog(ul.ownerDocument.body);
        this.runCustomizer(ul, dialog);
        return ul;
    }
    logout() {
        const doc = this.options.document;
        this.adapter.wait();
        LoginUtils.logout().then(() => {
            this.fire(LoginMenu.EVENT_LOGGED_OUT);
            const userMenu = doc.querySelector('#user_menu');
            if (userMenu) {
                userMenu.style.display = 'none';
            }
            this.node.querySelector('#login_menu').style.display = null;
            Array.from(doc.querySelectorAll('.login_required')).forEach((n) => {
                n.classList.add('disabled');
            });
            this.adapter.ready();
        });
    }
    runCustomizer(menu, dialog) {
        Promise.all(this.customizer.map((d) => d.load())).then((loaded) => {
            loaded.forEach((l) => l.factory(menu, dialog));
        });
    }
    forceShowDialog() {
        const doc = this.options.document;
        const loginDialog = doc.querySelector('#loginDialog');
        loginDialog.querySelector('.modal-header .close').classList.add('hidden'); // disable closing the dialog
        this.adapter.showAndFocusOn('#loginDialog', '#login_username');
    }
    initLoginDialog(body) {
        let loginForm = this.options.loginForm;
        if (!loginForm) {
            const t = this.customizer.find((d) => d.template != null);
            if (t) {
                loginForm = t.template;
            }
            else {
                loginForm = LoginUtils.defaultLoginForm();
            }
        }
        body.insertAdjacentHTML('beforeend', `
      <!--login dialog-->
      <div class="modal fade" id="loginDialog" tabindex="-1" role="dialog" aria-labelledby="loginDialog" data-keyboard="false" data-backdrop="static">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-label="${I18nextManager.getInstance().i18n.t('phovea:security_flask.closeButton')}"><span
                aria-hidden="true">&times;</span></button>
              <h4 class="modal-title">${I18nextManager.getInstance().i18n.t('phovea:security_flask.title')}</h4>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning" role="alert">${I18nextManager.getInstance().i18n.t('phovea:security_flask.alert')}</div>
              ${loginForm}
            </div>
          </div>
        </div>
      </div>`);
        const dialog = body.querySelector('#loginDialog');
        const form = dialog.querySelector('form');
        LoginUtils.bindLoginForm(form, (error, user) => {
            const success = !error && user;
            if (!success) {
                this.adapter.ready();
                if (error === 'not_reachable') {
                    dialog.classList.add('has-warning');
                }
                else {
                    dialog.classList.remove('has-warning');
                    dialog.classList.add('has-error');
                }
                return;
            }
            this.fire(LoginMenu.EVENT_LOGGED_IN);
            const doc = this.options.document;
            dialog.classList.remove('has-error', 'has-warning');
            const userMenu = doc.querySelector('#user_menu');
            if (userMenu) {
                userMenu.style.display = null;
                const userName = userMenu.querySelector('a:first-of-type span');
                if (userName) {
                    userName.textContent = user.name;
                }
            }
            doc.querySelector('#login_menu').style.display = 'none';
            // remove all .login_required magic flags
            Array.from(doc.querySelectorAll('.login_required.disabled')).forEach((n) => {
                n.classList.remove('disabled');
                n.setAttribute('disabled', null);
            });
            this.adapter.hideDialog('#loginDialog');
        }, () => {
            // reset error
            dialog.classList.remove('has-error', 'has-warning');
        });
        return dialog;
    }
}
LoginMenu.EVENT_LOGGED_IN = 'loggedIn';
LoginMenu.EVENT_LOGGED_OUT = 'loggedOut';
//# sourceMappingURL=LoginMenu.js.map