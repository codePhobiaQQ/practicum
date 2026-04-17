import { ThemeConfig } from 'antd'

export const antdConfig: ThemeConfig = {
  token: {
    colorPrimary: '#260C8F',
    colorBgBase: '#FFFFFF',
    colorBorder: '#E5E5E5',
    colorBgContainer: '#F9F9F9',
    colorText: '#1F2937',
    colorTextSecondary: '#6B7280',
    colorTextPlaceholder: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 8,
  },
  components: {
    Typography: {
      colorText: '#1F2937',
      lineHeight: 1.4,
    },
    Button: {
      colorPrimary: '#260C8F',
      controlHeight: 40,
      borderRadius: 8,
    },
    Input: {
      activeBg: '#FFFFFF',
      colorBorder: '#E5E5E5',
      colorBgContainer: '#FFFFFF',
      hoverBorderColor: '#260C8F',
      paddingBlock: 12,
      paddingInline: 12,
      controlHeight: 40,
      inputFontSize: 15,
      borderRadius: 8,
    },
    Menu: {
      colorBgBase: '#FFFFFF',
      colorBgContainer: '#FFFFFF',
      itemBg: '#FFFFFF',
      colorItemBgHover: '#F9F9F9',
      colorItemBgSelected: '#F0F0FF',
      colorItemBgSelectedHorizontal: '#F0F0FF',
      itemColor: '#1F2937',
      itemHoverColor: '#260C8F',
    },
    Modal: {
      colorBgElevated: '#FFFFFF',
      colorBgContainer: '#FFFFFF',
      colorBorder: '#E5E5E5',
      borderRadiusLG: 8,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    Flex: {},
    Form: {},
  },
}
