---
title: "関数に名前付きで引数を渡したい feat. JavaScript"
emoji: "🤓"
type: "tech"
topics:
  - "JavaScript"
  - "typescript"
  - "関数"
  - "分割代入"
published: false
---

## メモ

- プロパティの順番ごちゃ混ぜパターン（オブジェクトありなし両方）
- プロパティの数を減らしたい

## はじめに

JavaScriptってなんで名前付きで引数を渡せないんだ？と思ったことありませんか？

```python
def print_baseball_team(
    pitcher,
    catcher,
    first_base,
    second_base,
    third_base,
    shortstop,
    left_field,
    center_field,
    right_field,
    manager,
    *substitutes
):
    print("=== 野球チームメンバー ===")
    print(f"投手: {pitcher}")
    print(f"捕手: {catcher}")
    print(f"一塁手: {first_base}")
    print(f"二塁手: {second_base}")
    print(f"三塁手: {third_base}")
    print(f"遊撃手: {shortstop}")
    print(f"左翼手: {left_field}")
    print(f"中堅手: {center_field}")
    print(f"右翼手: {right_field}")
    print(f"監督: {manager}")
    
    if substitutes:
        print(f"控え: {', '.join(substitutes)}")

# 使用例
print_baseball_team(
    pitcher="伊藤博文",
    catcher="西郷隆盛",
    first_base="武蔵坊弁慶",
    second_base="源義経",
    third_base="中臣鎌足",
    shortstop="小野妹子",
    left_field="徳川家康",
    center_field="豊臣秀吉",
    right_field="織田信長",
    manager="諸葛亮孔明",
    "木下藤吉郎",
    "木下藤吉郎秀吉",
    "羽柴秀吉"
)
```

## オブジェクトを渡してみる

```typescript
interface BaseballTeamProps {
  // 省略
}

function printBaseballTeam(props: BaseballTeamProps): void {
  console.log("=== 野球チームメンバー ===");
  console.log(`投手: ${props.pitcher}`);
  console.log(`捕手: ${props.catcher}`);
  console.log(`一塁手: ${props.firstBase}`);
  console.log(`二塁手: ${props.secondBase}`);
  console.log(`三塁手: ${props.thirdBase}`);
  console.log(`遊撃手: ${props.shortstop}`);
  console.log(`左翼手: ${props.leftField}`);
  console.log(`中堅手: ${props.centerField}`);
  console.log(`右翼手: ${props.rightField}`);
  console.log(`監督: ${props.manager}`);
  
  if (props.substitutes.length > 0) {
    console.log(`\n控え: ${props.substitutes.join(", ")}`);
  }
}

// 使用例
printBaseballTeam({
  pitcher: "伊藤博文",
  catcher: "西郷隆盛",
  firstBase: "武蔵坊弁慶",
  secondBase: "源義経",
  thirdBase: "中臣鎌足",
  shortstop: "小野妹子",
  leftField: "徳川家康",
  centerField: "豊臣秀吉",
  rightField: "織田信長",
  manager: "諸葛亮孔明",
  substitutes: ["木下藤吉郎", "木下藤吉郎秀吉", "羽柴秀吉"]
});
```

VSCodeの画面のスクショ？？

## 分割代入で受け取ってみる

VSCodeの画面のスクショ？？

```typescript
interface BaseballTeamProps {
  // 省略
}

function printBaseballTeam({
  pitcher,
  catcher,
  firstBase,
  secondBase,
  thirdBase,
  shortstop,
  leftField,
  centerField,
  rightField,
  manager,
  substitutes
}: BaseballTeamProps): void {
  console.log("=== 野球チームメンバー ===");
  console.log(`投手: ${pitcher}`);
  console.log(`捕手: ${catcher}`);
  console.log(`一塁手: ${firstBase}`);
  console.log(`二塁手: ${secondBase}`);
  console.log(`三塁手: ${thirdBase}`);
  console.log(`遊撃手: ${shortstop}`);
  console.log(`左翼手: ${leftField}`);
  console.log(`中堅手: ${centerField}`);
  console.log(`右翼手: ${rightField}`);
  console.log(`監督: ${manager}`);
  
  if (substitutes.length > 0) {
    console.log(`\n控え: ${substitutes.join(", ")}`);
  }
}

// 使用例
printBaseballTeam({
  pitcher: "伊藤博文",
  catcher: "西郷隆盛",
  firstBase: "武蔵坊弁慶",
  secondBase: "源義経",
  thirdBase: "中臣鎌足",
  shortstop: "小野妹子",
  leftField: "徳川家康",
  centerField: "豊臣秀吉",
  rightField: "織田信長",
  manager: "諸葛亮孔明",
  substitutes: ["木下藤吉郎", "木下藤吉郎秀吉", "羽柴秀吉"]
});
```

## まとめ

pointer: noneでも十分だね

あと作成しながら思っていましたが、もっと説明しやすい例ありますよね。〜とか〜とか。縦に長すぎて見づらいですよね