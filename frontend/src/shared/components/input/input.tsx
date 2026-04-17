import { Input as InputAntd, InputProps, Typography, Flex } from 'antd'
import { TextProps } from 'antd/lib/typography/Text'

interface Props extends InputProps {
  labelProps?: TextProps
}

export const Input = (props: Props) => {
  const { placeholder = 'Введите данные', labelProps, ...otherProps } = props

  // -------- Label -----------
  let label
  if (labelProps) {
    label = <Typography.Text {...labelProps} />
  }

  // -------- Input -----------
  let input
  if (otherProps.type == 'password') {
    input = <InputAntd.Password placeholder={placeholder} {...otherProps} />
  } else {
    input = <InputAntd placeholder={placeholder} {...otherProps} />
  }

  return (
    <Flex gap="small" vertical>
      {label}
      {input}
    </Flex>
  )
}
