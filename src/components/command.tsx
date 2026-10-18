/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus --
 * The input keeps focus and drives the options through aria-activedescendant,
 * the ARIA combobox pattern. Native select and datalist cannot render rich rows. */
import {
	createContext,
	createEffect,
	createSignal,
	createUniqueId,
	onCleanup,
	onMount,
	splitProps,
	useContext,
	type Accessor,
	type Component,
	type ComponentProps,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'

// Enter selects through a DOM event, so an item's `onSelect` runs without a
// click that a nested link would also handle.
const SELECT_EVENT = 'command-item-select'

const OPTION_SELECTOR = '[role="option"]:not([aria-disabled="true"])'

interface CommandContextValue {
	value: Accessor<string>
	setValue: (value: string) => void
	listId: string
	inputId: string
	setList: (list: HTMLElement | undefined) => void
	activeItemId: Accessor<string | undefined>
	setActiveItemId: (id: string | undefined) => void
}

const CommandContext = createContext<CommandContextValue>()

function useCommand() {
	const context = useContext(CommandContext)

	if (!context) throw new Error('Command parts must render inside <Command>')

	return context
}

/** Headless combobox surface (unstyled, so it lives outside `ui/`): the input keeps focus while arrow keys move the
 * highlighted option and Enter selects it. Results are filtered by the caller. */
function Command(
	props: Omit<ComponentProps<'div'>, 'onKeyDown'> & {
		value: string
		onValueChange: (value: string) => void
		loop?: boolean
		onKeyDown?: (event: KeyboardEvent) => void
	},
) {
	const [local, rest] = splitProps(props, [
		'value',
		'onValueChange',
		'loop',
		'onKeyDown',
		'class',
		'children',
	])

	const [list, setList] = createSignal<HTMLElement>()
	const [activeItemId, setActiveItemId] = createSignal<string>()

	const options = () =>
		Array.from(list()?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? [])

	const selectedOption = () =>
		list()?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')

	const highlight = (option: HTMLElement | undefined) => {
		if (!option) return
		local.onValueChange(option.dataset['value'] ?? '')
		requestAnimationFrame(() => option.scrollIntoView({ block: 'nearest' }))
	}

	const move = (step: 1 | -1) => {
		const all = options()
		const current = all.findIndex((option) => option === selectedOption())

		if (current === -1) {
			highlight(step === 1 ? all[0] : all.at(-1))

			return
		}

		const next = current + step

		if (local.loop) {
			highlight(all[(next + all.length) % all.length])
		} else {
			highlight(all[next])
		}
	}

	const handleKeyDown = (event: KeyboardEvent) => {
		local.onKeyDown?.(event)

		if (event.defaultPrevented) return

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault()
				move(1)
				break
			case 'ArrowUp':
				event.preventDefault()
				move(-1)
				break
			case 'Home':
				event.preventDefault()
				highlight(options()[0])
				break
			case 'End':
				event.preventDefault()
				highlight(options().at(-1))
				break
			case 'Enter':
				if (event.isComposing) break
				event.preventDefault()
				selectedOption()?.dispatchEvent(new Event(SELECT_EVENT))
				break
		}
	}

	const context: CommandContextValue = {
		value: () => local.value,
		setValue: (value) => local.onValueChange(value),
		listId: createUniqueId(),
		inputId: createUniqueId(),
		setList,
		activeItemId,
		setActiveItemId,
	}

	return (
		<CommandContext.Provider value={context}>
			{/* The keydown handler listens for events bubbling up from the combobox input. */}
			{/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
			<div
				data-slot="command"
				tabindex={-1}
				class={local.class}
				onKeyDown={handleKeyDown}
				{...rest}
			>
				{local.children}
			</div>
		</CommandContext.Provider>
	)
}

/** Renders a native input unless `as` swaps in a styled input component. */
function CommandInput(
	props: ComponentProps<'input'> & {
		as?: Component<ComponentProps<'input'>>
	},
) {
	const context = useCommand()
	const [local, rest] = splitProps(props, ['as'])

	return (
		<Dynamic
			component={local.as ?? 'input'}
			id={context.inputId}
			type="text"
			role="combobox"
			autocomplete="off"
			autocorrect="off"
			spellcheck={false}
			aria-autocomplete="list"
			aria-expanded="true"
			aria-controls={context.listId}
			aria-activedescendant={context.activeItemId()}
			{...rest}
		/>
	)
}

function CommandList(props: ComponentProps<'div'>) {
	const context = useCommand()
	const [local, rest] = splitProps(props, ['children'])

	return (
		<div
			data-slot="command-list"
			role="listbox"
			aria-label="Suggestions"
			id={context.listId}
			ref={context.setList}
			{...rest}
		>
			{local.children}
		</div>
	)
}

function CommandItem(
	props: Omit<ComponentProps<'div'>, 'onSelect'> & {
		value: string
		onSelect: () => void
	},
) {
	const context = useCommand()
	const id = createUniqueId()
	const [local, rest] = splitProps(props, ['value', 'onSelect'])
	const selected = () => context.value() === local.value
	let element: HTMLDivElement | undefined

	onMount(() => {
		const select = () => local.onSelect()

		element?.addEventListener(SELECT_EVENT, select)
		onCleanup(() => element?.removeEventListener(SELECT_EVENT, select))
	})

	createEffect(() => {
		if (!selected()) return

		context.setActiveItemId(id)
		onCleanup(() => {
			if (context.activeItemId() === id) context.setActiveItemId(undefined)
		})
	})

	return (
		<div
			ref={element}
			id={id}
			data-slot="command-item"
			data-value={local.value}
			role="option"
			aria-selected={selected()}
			onPointerMove={() => context.setValue(local.value)}
			onClick={() => local.onSelect()}
			{...rest}
		/>
	)
}

function CommandLoading(props: ComponentProps<'div'> & { label: string }) {
	const [local, rest] = splitProps(props, ['label', 'children'])

	return (
		<div
			data-slot="command-loading"
			role="progressbar"
			aria-label={local.label}
			{...rest}
		>
			<div aria-hidden="true">{local.children}</div>
		</div>
	)
}

export { Command, CommandInput, CommandItem, CommandList, CommandLoading }
