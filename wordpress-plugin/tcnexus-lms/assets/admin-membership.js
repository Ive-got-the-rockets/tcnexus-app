( function () {
	'use strict';

	function syncTierButton( select ) {
		var form = select.closest( 'form' );
		var button = form ? form.querySelector( 'button[type="submit"]' ) : null;
		if ( button ) {
			button.disabled = select.value === select.getAttribute( 'data-initial-tier' );
		}
	}

	document.addEventListener( 'DOMContentLoaded', function () {
		document.querySelectorAll( '[data-tier-picker]' ).forEach( function ( picker ) {
			var form = picker.closest( 'form' );
			var input = form ? form.querySelector( 'input[name="tier"]' ) : null;
			var trigger = picker.querySelector( '[data-tier-trigger]' );
			var menu = picker.querySelector( '[role="listbox"]' );
			if ( ! input || ! trigger || ! menu ) {
				return;
			}

			function closeMenu() {
				menu.hidden = true;
				trigger.setAttribute( 'aria-expanded', 'false' );
			}

			trigger.addEventListener( 'click', function () {
				var isOpen = ! menu.hidden;
				menu.hidden = isOpen;
				trigger.setAttribute( 'aria-expanded', isOpen ? 'false' : 'true' );
			} );
			picker.querySelectorAll( '[data-tier-option]' ).forEach( function ( option ) {
				option.addEventListener( 'click', function () {
					input.value = option.getAttribute( 'data-tier-option' );
					trigger.firstChild.textContent = option.textContent;
					picker.querySelectorAll( '[data-tier-option]' ).forEach( function ( item ) {
						item.setAttribute( 'aria-selected', item === option ? 'true' : 'false' );
					} );
					closeMenu();
					syncTierButton( input );
				} );
			} );
			document.addEventListener( 'click', function ( event ) {
				if ( ! picker.contains( event.target ) ) {
					closeMenu();
				}
			} );
			syncTierButton( input );
		} );
	} );
}() );
